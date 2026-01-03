"""LLM-powered generator that emits MongoDB query specs."""

import json
import os
from textwrap import dedent
from typing import Any, Dict, Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI


MONGO_SCHEMA_SUMMARY = dedent(
    """
    You read from MongoDB collections that power a Kayak-like concierge.
    The key collections and fields are:

    1. flights
       - id
       - flightNumber (string)
       - airline (string)
       - from (IATA code)
       - to (IATA code)
       - departDate (YYYY-MM-DD) - Filter outbound flights by this field
       - returnDate (YYYY-MM-DD or null) - Most flights are ONE-WAY (returnDate is null). Only filter by returnDate if explicitly searching for round-trip flights.
       - departureTime (HH:MM)
       - arrivalTime (HH:MM)
       - durationMinutes (int)
       - nonstop (bool)
       - stops (int)
       - price (number)
       - availableSeats (int)
       - class (economy | business | first)

    2. hotels
       - id
       - name
       - city, state, country
       - neighbourhood
       - pricePerNight (number)
       - rating (number, 1-5)
       - amenities (array of strings)
       - availableRooms (int)

    3. cars
       - id
       - vendor
       - city, state, country
       - type (Economy, SUV, Luxury, etc.)
       - seats
       - pricePerDay (number)

    4. airports
       - code (IATA)
       - city, state, country
       - name
       - timezone

    Rules:
    - Only read data; NEVER request inserts/updates.
    - Always limit to <= 20 documents.
    - Filters must be valid MongoDB JSON (use $gte/$lte/$regex for ranges).
    - Prefer case-insensitive regex for fuzzy text fields.
    - Include sort order when user asks for "cheapest", "top", or "latest".
    - Respect context (destination city, budget, dates, traveler count).
    - CRITICAL FOR FLIGHTS: ALL flights are ONE-WAY only (returnDate is always null). NEVER add a returnDate filter.
      * For one-way requests: filter by departDate matching the desired date
      * For round-trip requests: search for outbound flights only using departDate (the system will handle return flights separately)
      * When user provides date range: use $gte/$lte on departDate to find all departing flights in that window
    """
).strip()


class MongoQueryGenerator:
    """Uses an LLM to build MongoDB query specs."""

    def __init__(self, llm: Optional[BaseChatModel] = None):
        model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        temperature = float(os.getenv("SQL_GENERATOR_TEMPERATURE", "0"))
        self.llm = llm or ChatOpenAI(model=model_name, temperature=temperature)

    async def generate(self, question: str, context: Dict[str, Any]) -> Dict[str, Any]:
        context_payload = json.dumps(context or {}, default=str)
        system_prompt = SystemMessage(content=MONGO_SCHEMA_SUMMARY)
        human_prompt = dedent(
            f"""
            Question: {question}
            Context JSON: {context_payload}

            Produce a strict JSON object with these keys:
            {{
                "collection": "flights|hotels|cars|airports",
                "filters": <MongoDB filter object>,
                "projection": <optional projection or null>,
                "sort": [["field", 1|-1], ...] or [],
                "limit": <int <= 20>
            }}

            CRITICAL FOR FLIGHTS - READ CAREFULLY:
            - ALL flights in the database are ONE-WAY only. The returnDate field is ALWAYS null.
            - NEVER add a returnDate filter to your query. It will return zero results.
            - For round-trip requests: Only search for OUTBOUND flights using departDate
            - For date ranges: Use $gte/$lte on departDate to find all flights departing in that window
            - Examples:
              * "departing 2025-12-06 returning 2025-12-09" → {{"departDate": "2025-12-06"}} (outbound only)
              * "flights from Dec 9 to Dec 13" → {{"departDate": {{"$gte": "2025-12-09", "$lte": "2025-12-13"}}}}
              * "round-trip Dec 10 to Dec 15" → {{"departDate": "2025-12-10"}} (outbound only)
            
            IMPORTANT FOR BUDGET/PRICE FILTERS:
            - Only add price filters if the user explicitly requests a budget constraint (e.g., "under $200", "cheap flights")
            - If context has a very low budget (under $100 for flights, under $30 for hotels, under $20 for cars), IGNORE it - it's likely a default value
            - Without explicit budget constraints, omit the price filter entirely to show all available options

            Use ISO date strings for dates. If the request cannot be satisfied, reply with __UNSUPPORTED__.
            """
        ).strip()

        response = await self.llm.ainvoke([system_prompt, HumanMessage(content=human_prompt)])
        spec = self._parse_spec(response.content)
        
        # DEBUG: Log the generated MongoDB query
        print("\nMongoDB Query Generated:")
        print(f"   Question: {question}")
        print(f"   Context: {context_payload}")
        print(f"   Spec: {json.dumps(spec, indent=2)}")
        
        return spec

    @staticmethod
    def _parse_spec(raw: str) -> Dict[str, Any]:
        if not raw:
            raise MongoQueryGeneratorError("Mongo query generator returned an empty response.")
        text = raw.strip()
        if text == "__UNSUPPORTED__":
            raise MongoQueryGeneratorError("This question cannot be answered with MongoDB listings.")
        
        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json or ```)
            lines = lines[1:]
            # Remove last line (```)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise MongoQueryGeneratorError(f"Mongo query generator returned invalid JSON: {exc}") from exc

        if not isinstance(data, dict):
            raise MongoQueryGeneratorError("Mongo query generator must return a JSON object.")
        if not data.get("collection"):
            raise MongoQueryGeneratorError("Mongo query generator did not provide a collection.")
        if "filters" not in data:
            raise MongoQueryGeneratorError("Mongo query generator did not provide filters.")
        if not data.get("limit"):
            data["limit"] = 10
        return data


class MongoQueryGeneratorError(RuntimeError):
    """Raised when the Mongo query generation step fails."""
