"""LangChain/LangGraph agent that can call Supabase MCP, Tavily Search, and Weather API."""

import json
import os
import re
from typing import Any, Dict, List, Optional, TypedDict

import httpx
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from tavily import TavilyClient

from mcp_client import MCPClient, MCPClientError
from sql_generator import SQLGenerator, SQLGeneratorError
from mongo_query_generator import MongoQueryGenerator, MongoQueryGeneratorError
from mongo_service import MongoService


SUPABASE_KEYWORDS = {
    "review",
    "reviews",
    "booking",
    "bookings",
    "payment",
    "payments",
    "invoice",
    "invoices",
    "deal",
    "deals",
    "refund",
    "refunds",
    "revenue",
    "spend",
    "transaction",
    "transactions",
}

MONGO_KEYWORDS = {
    "flight",
    "flights",
    "hotel",
    "hotels",
    "stay",
    "stays",
    "car",
    "cars",
    "rental",
    "rentals",
    "airport",
    "airports",
    "bundle",
    "itinerary",
    "destination",
    "trip",
    "trips",
    "vacation",
    "getaway",
}

WEATHER_KEYWORDS = {
    "weather",
    "temperature",
    "forecast",
    "rain",
    "sunny",
    "snow",
    "wind",
}


def is_supabase_question(question: str) -> bool:
    lower = question.lower()
    return any(keyword in lower for keyword in SUPABASE_KEYWORDS)

def is_mongo_question(question: str) -> bool:
    """Check if question requires MongoDB search (has sufficient details for a query)"""
    lower = question.lower()
    
    # Must have search intent
    search_patterns = ["find", "show me", "show", "search for", "looking for", "list", "available", "get me", "what are"]
    has_search_intent = any(pattern in lower for pattern in search_patterns)
    
    # Must have MongoDB entity
    has_mongo_entity = any(keyword in lower for keyword in MONGO_KEYWORDS)
    
    # Must have specific details (location, route, etc)
    has_city = any(city in lower for city in ["san francisco", "los angeles", "new york", "chicago", "miami", "seattle", "boston", "vegas"])
    has_airport = any(code in lower for code in ["sfo", "lax", "jfk", "ord", "mia", "sea", "bos", "las"])
    has_location_preposition = any(pattern in lower for pattern in [" in ", " near ", " around "])
    has_route = " to " in lower and " from " in lower
    
    has_specifics = has_city or has_airport or has_location_preposition or has_route
    
    return has_mongo_entity and has_search_intent and has_specifics


def is_weather_question(question: str) -> bool:
    lower = question.lower()
    return any(keyword in lower for keyword in WEATHER_KEYWORDS)


class AgentState(TypedDict):
    question: str
    context: Dict[str, Any]
    responses: List[Dict[str, Any]]


class SupabaseLangGraph:
    """LangGraph router that calls Supabase MCP, Weather API, or Tavily search."""

    def __init__(self):
        self.mcp_client = MCPClient()
        self.weather_api_key = os.getenv("WEATHER_API_KEY")
        self.tavily_enabled = os.getenv("TAVILY_ENABLED", "false").lower() == "true"
        self.tavily_client: Optional[TavilyClient] = None
        self.sql_generator = SQLGenerator()
        tavily_key = os.getenv("TAVILY_API_KEY")
        if self.tavily_enabled and tavily_key:
            self.tavily_client = TavilyClient(api_key=tavily_key)

        # Direct MongoDB connection using motor
        self.mongo_service: Optional[MongoService] = None
        mongo_uri = os.getenv("MONGODB_URI")
        if mongo_uri:
            self.mongo_service = MongoService()
        self.mongo_generator = MongoQueryGenerator()

        self.llm: Optional[ChatOpenAI] = None
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            self.llm = ChatOpenAI(
                api_key=openai_key,
                model=model,
                temperature=0,
            )

        graph = StateGraph(AgentState)
        graph.add_node("router", self._router)
        graph.add_node("supabase_tool", self._supabase_tool)
        graph.add_node("weather_tool", self._weather_tool)
        graph.add_node("search_tool", self._search_tool)
        graph.add_node("mongo_tool", self._mongo_tool)
        graph.set_entry_point("router")
        graph.add_conditional_edges(
            "router",
            self._route_question,
            {
                "supabase": "supabase_tool",
                "mongo": "mongo_tool",
                "weather": "weather_tool",
                "search": "search_tool",
            },
        )
        graph.add_edge("supabase_tool", END)
        graph.add_edge("mongo_tool", END)
        graph.add_edge("weather_tool", END)
        graph.add_edge("search_tool", END)
        self.graph = graph.compile()

    async def _router(self, state: AgentState) -> AgentState:
        return state

    def _route_question(self, state: AgentState) -> str:
        question = state["question"]
        context = state.get("context") or {}
        if is_supabase_question(question):
            return "supabase"
        # Check weather BEFORE mongo since weather keywords are more specific
        if is_weather_question(question):
            return "weather"
        if self._should_use_mongo(question, context):
            return "mongo"
        return "search"

    def _should_use_mongo(self, question: str, context: Dict[str, Any]) -> bool:
        return is_mongo_question(question) or self._has_trip_context(context)

    @staticmethod
    def _has_trip_context(context: Dict[str, Any]) -> bool:
        """Check if context has enough trip info to query MongoDB (budget is optional)"""
        if not context:
            return False
        intent_type = context.get("intent_type", "")
        destination = (
            context.get("destination")
            or context.get("city")
            or context.get("to")
            or context.get("destinations")
        )
        has_dates = bool(context.get("check_in") and context.get("check_out"))
        
        # For flights, also need origin
        if "flight" in intent_type or "fly" in intent_type:
            origin = context.get("origin") or context.get("from")
            return bool(origin and destination and has_dates)
        
        # For hotels and cars, just need destination and dates (budget optional)
        return bool(destination and has_dates)

    async def _supabase_tool(self, state: AgentState) -> AgentState:
        question = state["question"]
        context = state.get("context") or {}
        responses = state.get("responses") or []

        user_id = (context.get("user_id") or "").strip()
        if not user_id:
            responses.append(
                {
                    "error": "Please log in to view personal bookings, payments, reviews, or deals.",
                    "source": "supabase",
                }
            )
            return {"responses": responses}

        try:
            sql = await self.sql_generator.generate(question, context)
            supabase_result = await self.mcp_client.execute_sql(sql)
            response = {
                "query": sql,
                "result": supabase_result.get("rows"),
                "raw": supabase_result.get("raw"),
                "explanation": "Query executed successfully.",
                "source": "supabase",
            }
            await self._augment_with_llm_answer(question, response)
        except SQLGeneratorError as exc:
            response = {"error": str(exc), "source": "supabase"}
        except MCPClientError as exc:  # type: ignore[name-defined]
            response = {"error": str(exc), "source": "supabase"}
        responses.append(response)
        return {"responses": responses}

    async def _mongo_tool(self, state: AgentState) -> AgentState:
        responses = state.get("responses") or []
        question = state["question"]
        context = state.get("context") or {}

        if not self.mongo_service:
            responses.append(
                {
                    "error": "MongoDB is not configured. Set MONGODB_URI in environment.",
                    "source": "mongo",
                }
            )
            return {"responses": responses}

        try:
            spec = await self.mongo_generator.generate(question, context)
        except MongoQueryGeneratorError as exc:
            responses.append({"error": str(exc), "source": "mongo"})
            return {"responses": responses}

        try:
            rows = await self.mongo_service.query(
                collection=spec.get("collection"),
                filters=spec.get("filters"),
                projection=spec.get("projection"),
                sort=spec.get("sort"),
                limit=spec.get("limit", 20),
            )
            
            # DEBUG: Log query results
            print(f"MongoDB Query Result: {len(rows)} documents found")
            if len(rows) == 0:
                print(f"   Zero results for collection: {spec.get('collection')}")
                print(f"   Filters used: {spec.get('filters')}")
                
        except Exception as exc:
            print(f"MongoDB query failed: {exc}")
            responses.append({"error": f"MongoDB query failed: {exc}", "source": "mongo"})
            return {"responses": responses}

        response = {
            "query": spec,
            "result": rows,
            "explanation": f"Fetched {len(rows)} {spec.get('collection')} record(s).",
            "source": "mongo",
        }
        await self._augment_with_llm_answer(question, response)
        responses.append(response)
        return {"responses": responses}

    async def _augment_with_llm_answer(self, question: str, response: Dict[str, Any]) -> None:
        if not self.llm:
            return

        rows = response.get("result") or response.get("rows") or response.get("data")
        # Don't skip if rows is empty list [] - we still want to generate a response
        # Only skip if rows is truly None (not set at all)
        if rows is None and "result" not in response and "rows" not in response and "data" not in response:
            return

        try:
            rows_text = json.dumps(rows, indent=2) if rows is not None else "No data"
        except Exception:
            rows_text = str(rows) if rows is not None else "No data"

        query_text = response.get("query") or "Unknown SQL"
        explanation = response.get("explanation") or ""

        prompt = (
            "You are a friendly travel assistant having a conversation with a customer. Answer their question based on the data provided. "
            "Provide a clear, natural response (2-4 sentences). Don't mention SQL, queries, or technical details - just provide helpful information. "
            "If there's no data, politely explain that you don't have that information yet or the customer hasn't made any bookings/payments. "
            "Be conversational and helpful."
            f"\n\nUser question: {question}\nData: {rows_text}"
        )

        try:
            llm_response = await self.llm.ainvoke(prompt)
            summary = getattr(llm_response, "content", None)
            if isinstance(summary, list):
                summary = "\n".join(str(chunk) for chunk in summary)
            if summary:
                response["llm_answer"] = summary
        except Exception as exc:
            response.setdefault("warnings", []).append(
                f"LLM summarization failed: {exc}"
            )
    
    async def _augment_weather_with_llm(self, question: str, response: Dict[str, Any]) -> None:
        """Generate natural language weather response using LLM"""
        if not self.llm:
            return

        weather_data = response.get("result")
        if not weather_data:
            return

        try:
            weather_text = json.dumps(weather_data, indent=2)
        except Exception:
            weather_text = str(weather_data)

        prompt = (
            "You are a friendly travel assistant. Convert this weather data into a natural, conversational response. "
            "Include temperature (convert to Fahrenheit too), conditions, and any travel tips based on the weather. "
            "Keep it concise and helpful (2-3 sentences)."
            f"\n\nUser question: {question}\nWeather data: {weather_text}"
        )

        try:
            llm_response = await self.llm.ainvoke(prompt)
            summary = getattr(llm_response, "content", None)
            if isinstance(summary, list):
                summary = "\n".join(str(chunk) for chunk in summary)
            if summary:
                response["llm_answer"] = summary
        except Exception as exc:
            response.setdefault("warnings", []).append(
                f"Weather LLM summarization failed: {exc}"
            )
    
    async def _augment_search_with_llm(self, question: str, response: Dict[str, Any]) -> None:
        """Generate natural language search response using LLM"""
        if not self.llm:
            return

        search_data = response.get("result")
        if not search_data:
            return

        # Extract relevant information from Tavily results
        try:
            if isinstance(search_data, dict):
                answer = search_data.get("answer", "")
                results = search_data.get("results", [])[:3]  # Top 3 results
                results_text = "\n".join([f"- {r.get('title', '')}: {r.get('content', '')[:200]}" for r in results])
            else:
                results_text = json.dumps(search_data, indent=2)
                answer = ""
        except Exception:
            results_text = str(search_data)
            answer = ""

        prompt = (
            "You are a helpful travel assistant. Answer the user's question based on the search results provided. "
            "Provide a clear, concise answer (2-3 sentences) with relevant information. "
            "Don't mention that you searched the web - just provide the helpful information naturally."
            f"\n\nUser question: {question}\nSearch answer: {answer}\nTop results: {results_text}"
        )

        try:
            llm_response = await self.llm.ainvoke(prompt)
            summary = getattr(llm_response, "content", None)
            if isinstance(summary, list):
                summary = "\n".join(str(chunk) for chunk in summary)
            if summary:
                response["llm_answer"] = summary
        except Exception as exc:
            response.setdefault("warnings", []).append(
                f"Search LLM summarization failed: {exc}"
            )

    async def _weather_tool(self, state: AgentState) -> AgentState:
        question = state["question"]
        context = state.get("context") or {}
        location = self._extract_location(question, context)
        responses = state.get("responses") or []

        if not self.weather_api_key:
            responses.append({"error": "Weather API key not configured."})
            return {"responses": responses}

        if not location:
            responses.append({"error": "Please specify a location for the weather query."})
            return {"responses": responses}

        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {"q": location, "units": "metric", "appid": self.weather_api_key}

        try:
            async with httpx.AsyncClient(timeout=20) as client:
                weather_resp = await client.get(url, params=params)
                weather_resp.raise_for_status()
                data = weather_resp.json()
                summary = {
                    "location": f"{data.get('name')}, {data.get('sys', {}).get('country', '')}",
                    "temperature_c": data.get("main", {}).get("temp"),
                    "feels_like_c": data.get("main", {}).get("feels_like"),
                    "conditions": data.get("weather", [{}])[0].get("description"),
                    "wind_m_s": data.get("wind", {}).get("speed"),
                    "humidity": data.get("main", {}).get("humidity"),
                }
                response = {
                    "result": summary,
                    "explanation": f"Here is the current weather for {location.title()}.",
                    "source": "weather",
                }
                # Add natural language response using LLM
                await self._augment_weather_with_llm(question, response)
                responses.append(response)
        except Exception as exc:
            responses.append({"error": f"Weather lookup failed: {exc}", "source": "weather"})

        return {"responses": responses}

    def _extract_location(self, question: str, context: Dict[str, Any]) -> Optional[str]:
        question_lower = question.lower()
        match = re.search(r"weather\s+(?:in|for|at)\s+([a-zA-Z\s,]+)", question_lower)
        if match:
            location = match.group(1).strip()
            location = re.sub(r"\b(right now|currently|today|tomorrow)\b", "", location, flags=re.IGNORECASE)
            return location.strip(" ,.?")
        return (
            context.get("city")
            or context.get("destination")
            or context.get("user_location")
        )

    async def _search_tool(self, state: AgentState) -> AgentState:
        responses = state.get("responses") or []
        if not self.tavily_client:
            responses.append({
                "error": "Web search is not enabled.",
                "explanation": "Enable Tavily by setting TAVILY_ENABLED=true and providing TAVILY_API_KEY."
            })
            return {"responses": responses}

        try:
            search_result = self.tavily_client.search(
                state["question"], search_depth="advanced"
            )
            response = {
                "result": search_result,
                "explanation": "Here are the top web search results.",
                "source": "search",
            }
            # Add natural language response using LLM
            await self._augment_search_with_llm(state["question"], response)
            responses.append(response)
        except Exception as exc:
            responses.append({"error": f"Tavily search failed: {exc}", "source": "search"})

        return {"responses": responses}

    async def ainvoke(
        self,
        question: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        state: AgentState = {
            "question": question,
            "context": context or {},
            "responses": [],
        }
        result = await self.graph.ainvoke(state)
        responses = result.get("responses", [])
        return responses[-1] if responses else {}
