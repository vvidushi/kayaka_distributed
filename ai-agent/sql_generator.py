"""LLM-powered SQL generator that translates natural questions into SELECT queries."""

import os
import re
from textwrap import dedent
from typing import Any, Dict, Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


SCHEMA_SUMMARY = dedent(
    """
    You are connected to a Supabase Postgres database that powers a Kayak-like travel concierge.
    Available tables (all live in the public schema):

    1. bookings
       - id (uuid, primary key, generated automatically)
       - user_id (text, required - MongoDB ObjectId or email)
       - booking_type (varchar(20): flight | hotel | car | bundle)
       - status (text: PENDING, CONFIRMED, CANCELLED, COMPLETED, default PENDING)
       - price_amount (numeric), price_currency (char(3), default USD)
       - itinerary (jsonb) - structured flight/hotel/car data
       - metadata (jsonb) - additional booking information
       - created_at, updated_at (timestamp)

    2. payments
       - id (uuid, primary key)
       - booking_id (uuid, references bookings.id)
       - user_id (text)
       - status (text: PENDING, SUCCEEDED, FAILED)
       - amount (numeric), currency (char)
       - transaction_reference, invoice_url (text)
       - created_at, updated_at (timestamp)

    3. reviews
       - id (uuid)
       - user_id (text)
       - listing_type (flight | hotel | car)
       - listing_id (text)
       - rating (smallint, 1-5)
       - title, body (text)
       - created_at (timestamp)

    4. deal
       - id (serial primary key)
       - deal_id (varchar slug)
       - deal_type (enum: FLIGHT, HOTEL, CAR)
       - origin, destination, listing_id (varchar)
       - price, avg_30d_price, deal_score, availability
       - tags (json), deal_metadata (json)
       - status (enum: ACTIVE, EXPIRED, SOLD_OUT)
       - created_at, updated_at

    5. bundle
       - flight_deal_id (int, references deal.id)
       - hotel_deal_id (int, references deal.id)
       - total_price, fit_score, why_this, what_to_watch
       - user_id, bundle_id
       - created_at

    6. watch
       - watch_id, user_id, bundle_id/deal_id
       - price_threshold, inventory_threshold
       - active (boolean)
       - created_at

    Rules:
    - Generate a single SELECT statement. Never emit INSERT/UPDATE/DDL.
    - Limit the result set to at most 20 rows.
    - Always filter by the active user when `user_id` is provided.
    - Use `user_id` directly (it is already the text identifier stored in the tables).
    - If only `user_email` is available and no `user_id`, respond with the literal string `__MISSING_USER_ID__`.
    - Prefer ordering by the most relevant timestamp (e.g., `ORDER BY created_at DESC`).
    - For payments, join bookings if that adds context (e.g., booking_type) but keep the query simple.
    - For reviews, include rating, title/body, listing_type, created_at.
    - For deals, show rows from the `deal` table with active status or by type mentioned in the prompt.
    - When the user asks for totals or counts, you may return aggregate values instead of raw rows.
    - NEVER reference tables outside of the set described above.
    """
).strip()

SQL_FENCE_RE = re.compile(r"```sql(.*?)```", re.DOTALL | re.IGNORECASE)


class SQLGenerator:
    """Uses an LLM to synthesize SQL given a natural language question."""

    def __init__(self, llm: Optional[BaseChatModel] = None):
        model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        temperature = float(os.getenv("SQL_GENERATOR_TEMPERATURE", "0"))
        self.llm = llm or ChatOpenAI(model=model_name, temperature=temperature)

    async def generate(self, question: str, context: Dict[str, Any]) -> str:
        user_id = (context.get("user_id") or "").strip()
        user_email = (context.get("user_email") or "").strip()

        if not user_id:
            raise SQLGeneratorError("Missing user_id in context; cannot build personalized query.")

        system_prompt = SystemMessage(content=SCHEMA_SUMMARY)
        human_context = dedent(
            f"""
            Question: {question}
            user_id: {user_id}
            user_email: {user_email or 'unknown'}

            Return only the SQL. If the instructions cannot be satisfied, reply with __UNSUPPORTED__.
            """
        ).strip()

        response = await self.llm.ainvoke([system_prompt, HumanMessage(content=human_context)])
        sql = self._extract_sql(response.content)
        if not sql:
            raise SQLGeneratorError("LLM did not return a SQL statement.")
        return sql.strip()

    @staticmethod
    def _extract_sql(content: str) -> str:
        if not content:
            return ""
        match = SQL_FENCE_RE.search(content)
        snippet = match.group(1) if match else content
        snippet = snippet.strip()
        if snippet.upper().startswith("SELECT"):
            return snippet
        return ""


class SQLGeneratorError(RuntimeError):
    """Raised when the SQL generation step fails."""
