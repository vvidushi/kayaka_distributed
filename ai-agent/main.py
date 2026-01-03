"""
Concierge AI & Health Monitoring Service
Multi-agent travel concierge with deal detection, bundle building, and WebSocket updates

ARCHITECTURE:
=============

1. BOOKING AGENT (Intent-Based Search Agent)
   - Mode: Default (no chat_mode set) or explicit search mode
   - Purpose: Travel planning and search with structured results
   - Input: Natural language travel queries
   - Processing: Uses IntentParser (LLM-based) to extract structured JSON context
   - Data Sources: 
     * MongoDB (via mongo_query_generator.py) for advanced searches
     * Supabase/PostgreSQL for user bookings and deals
     * Deal cache (in-memory) for real-time deal matching
   - Output: JSON bundles + natural language summary
   - Features:
     * Extracts origin, destination, dates, travelers, budget
     * Clarification logic for missing information
     * Builds flight/hotel bundles from deal cache
     * Returns structured bundle data for UI rendering
   - Integration: AgentInlineChat component in FlightsPage/HotelsPage

2. FLOATING CHAT AGENT (General Assistant)
   - Mode: chat_mode="booking_chat"
   - Purpose: General travel questions and booking assistance
   - Input: Natural language questions (no structured search)
   - Processing: Natural language only, no intent extraction
   - Data Sources:
     * MongoDB for booking-related queries
     * Supabase/PostgreSQL for user data
     * Tavily API for web search (general questions)
     * Weather API for weather information
     * OpenAI LLM for conversational responses
     * Deal cache context (when deal_ids provided)
   - Output: ONLY natural language responses (never JSON bundles)
   - Features:
     * Answers booking/policy questions
     * Provides weather information
     * General travel advice
     * Links to relevant pages
     * Context-aware when deal_ids in session
   - Integration: BookingChatWidget (floating button on all pages)

3. DEALS WORKFLOW (Real-time Deal Updates)
   - Purpose: Ingest, process, and broadcast travel deals
   - Components:
     * DealIngestor: Reads deals from CSV feed
     * DealProcessor: Tags and scores deals
     * deal_feed_refresh_task: Background task (rotates deals periodically)
     * watch_monitor_task: Monitors price/inventory alerts
   - Data Flow:
     1. CSV feed → DealIngestor.load_raw_records()
     2. DealProcessor.tag_deals() → scores and tags
     3. Persist to PostgreSQL → update deal_cache
     4. WebSocket broadcast to connected clients
   - WebSocket Events:
     * "deal_update": New deals available
     * "price_drop": Deal price dropped below watch threshold
     * "inventory_low": Deal availability below threshold
     * "watch_alert": General watch notifications
   - Integration: WebSocket endpoint /events?session_id=<id>

CHAT MODES:
===========
- None (default): Booking Agent - Intent-based search with JSON + NL
- "booking_chat": Floating Chat Agent - Pure natural language assistant

DATA SOURCES:
=============
- Deal Cache: In-memory cache of active deals (flights/hotels/cars)
- PostgreSQL (Supabase): Users, bookings, deals, chat sessions, watches
- MongoDB: Advanced search and analytics queries
- Redis: Deal cache persistence across restarts
- CSV Feed: Source of truth for deal ingestion
- Tavily API: Web search for general questions
- Weather API: Real-time weather data
- OpenAI API: LLM for intent parsing and responses
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Set
from datetime import datetime, timedelta
import uvicorn
import os
import json
import asyncio
from contextlib import asynccontextmanager
import random
from collections import defaultdict

from redis import Redis
from copy import deepcopy

# Health check imports
import psutil
import time

# Local imports
from models import Deal, Bundle, Watch, ChatSession, DealType, DealStatus
from deal_processor import DealProcessor
from bundle_builder import BundleBuilder
from intent_parser import IntentParser
from mock_data import generate_mock_deals
from langchain_agent import (
    SupabaseLangGraph,
    is_supabase_question,
    is_weather_question,
    is_mongo_question,
)
from deal_ingestor import DealIngestor
from mongo_service import MongoService

# SQLModel setup
from sqlmodel import SQLModel, create_engine, Session, select, delete

# Database setup - Supabase/PostgreSQL only
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DATABASE_URL")
if not DATABASE_URL or "postgres" not in DATABASE_URL.lower():
    raise RuntimeError("DATABASE_URL must be set to a Supabase/PostgreSQL connection string")

engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

# Create tables
SQLModel.metadata.create_all(engine)

app = FastAPI(
    title="Concierge AI & Health Monitoring Service",
    description="Multi-agent travel concierge with deal detection, bundle building, and real-time updates",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}  # session_id -> set of websockets
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].discard(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.add(connection)
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn, session_id)
    
    async def broadcast_to_all(self, message: dict):
        """Broadcast message to all connected WebSocket clients"""
        disconnected = []
        for session_id, connections in list(self.active_connections.items()):
            for connection in list(connections):
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append((connection, session_id))
        # Clean up disconnected connections
        for conn, sess_id in disconnected:
            self.disconnect(conn, sess_id)

manager = ConnectionManager()

# Initialize LangGraph agent for Supabase/Tavily/Weather routing
supabase_langgraph_agent = SupabaseLangGraph()

# Deals feed ingestion
deal_ingestor = DealIngestor()
DEAL_REFRESH_SECONDS = int(os.getenv("DEAL_REFRESH_SECONDS", "3600"))
DEAL_LIMITS = {
    DealType.FLIGHT: int(os.getenv("DEALS_PER_FLIGHT", "6")),
    DealType.HOTEL: int(os.getenv("DEALS_PER_HOTEL", "6")),
    DealType.CAR: int(os.getenv("DEALS_PER_CAR", "6")),
}

# In-memory deal cache (in production, use Redis)
deal_cache: Dict[str, Deal] = {}

REDIS_URL = os.getenv("AI_AGENT_REDIS_URL") or os.getenv("REDIS_URL")
DEAL_CACHE_KEY = os.getenv("DEAL_CACHE_KEY", "concierge:deals")
redis_client: Optional[Redis] = None

if REDIS_URL:
    try:
        redis_client = Redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        redis_client.ping()
        print("Connected to Redis cache for AI agent")
    except Exception as exc:
        print(f"Redis connection failed: {exc}")
        redis_client = None

DB_QUERY_KEYWORDS = [
    "how many",
    "count",
    "list",
    "show me",
    "find all",
    "what are",
    "which",
    "when did",
    "who booked",
    "total",
    "average",
    "price",
]

SEARCH_KEYWORDS = [
    "news",
    "trending",
    "what's happening",
    "latest update",
    "ideas",
    "where should",
    "suggest",
    "things to do",
    "top places",
]

# Initialize LLM-based IntentParser
intent_parser = IntentParser()

# Initialize MongoDB service for direct queries
mongo_service = MongoService()


async def search_flights_mongo(origin: str = None, destination: str = None, depart_date: str = None, limit: int = 20) -> List[Dict[str, Any]]:
    """Search flights directly from MongoDB"""
    filters = {}
    if origin:
        filters["from"] = origin
    if destination:
        filters["to"] = destination
    if depart_date:
        filters["departDate"] = depart_date
    
    print(f"[MongoDB Flight Search] Filters: {filters}")
    
    results = await mongo_service.query(
        collection="flights",
        filters=filters,
        sort=[["price", 1]],  # Sort by price ascending
        limit=limit
    )
    
    print(f"[MongoDB Flight Search] Found {len(results)} flights")
    return results


async def search_hotels_mongo(city: str = None, limit: int = 20) -> List[Dict[str, Any]]:
    """Search hotels directly from MongoDB"""
    filters = {}
    if city:
        filters["city"] = city
    
    print(f"[MongoDB Hotel Search] Filters: {filters}")
    
    results = await mongo_service.query(
        collection="hotels",
        filters=filters,
        sort=[["pricePerNight", 1]],  # Sort by price ascending
        limit=limit
    )
    
    print(f"[MongoDB Hotel Search] Found {len(results)} hotels")
    return results


async def search_cars_mongo(city: str = None, limit: int = 20) -> List[Dict[str, Any]]:
    """Search cars directly from MongoDB"""
    filters = {}
    if city:
        filters["city"] = city
    
    print(f"[MongoDB Car Search] Filters: {filters}")
    
    results = await mongo_service.query(
        collection="cars",
        filters=filters,
        sort=[["pricePerDay", 1]],  # Sort by price ascending
        limit=limit
    )
    
    print(f"[MongoDB Car Search] Found {len(results)} cars")
    return results


def looks_like_db_question(message: str) -> bool:
    lower = message.lower()
    return any(keyword in lower for keyword in DB_QUERY_KEYWORDS)


def is_search_question(message: str) -> bool:
    lower = message.lower()
    return any(keyword in lower for keyword in SEARCH_KEYWORDS)


def context_ready_for_mongo(context: Optional[Dict[str, Any]]) -> bool:
    if not context:
        return False
    destination = context.get("destination") or context.get("city") or context.get("to")
    has_dates = bool(context.get("check_in") and context.get("check_out"))
    has_budget = bool(context.get("budget"))
    return bool(destination and has_dates and has_budget)


def should_use_langgraph(message: str, context: Optional[Dict[str, Any]] = None) -> bool:
    return (
        is_supabase_question(message)
        or looks_like_db_question(message)
        or is_weather_question(message)
        or is_search_question(message)
        or is_mongo_question(message)
        or context_ready_for_mongo(context)
    )


def format_supabase_response(response: Dict[str, Any], chat_mode: Optional[str] = None) -> str:
    """Return conversational answer for Supabase results, preferring LLM summaries."""
    llm_answer = response.get("llm_answer")
    
    # In booking_chat mode, return ONLY the natural language response
    if chat_mode == "booking_chat" and llm_answer:
        return llm_answer
    
    rows = response.get("result")
    if rows is None:
        rows = response.get("rows") or response.get("data")

    if rows is None:
        result_text = "No rows were returned."
    else:
        try:
            result_text = json.dumps(rows, indent=2)
        except Exception:
            result_text = str(rows)

    explanation = response.get("explanation") or "Here are the latest results I found."
    leading_text = llm_answer or explanation

    detail_sections = []
    if llm_answer:
        detail_sections.append("Raw data:\n" + result_text)
    else:
        detail_sections.append(result_text)

    query = response.get("query")
    if query:
        detail_sections.append(f"SQL: {query}")

    warnings = response.get("warnings")
    if warnings:
        detail_sections.append("Warnings: " + "; ".join(warnings))

    detail_block = "\n\n".join(section for section in detail_sections if section)
    return f"{leading_text}\n\n{detail_block}" if detail_block else leading_text


def format_generic_agent_response(response: Dict[str, Any], chat_mode: Optional[str] = None) -> str:
    """Return readable answer for weather/search tool calls."""
    # Prioritize LLM-generated natural language response
    llm_answer = response.get("llm_answer")
    if llm_answer:
        return llm_answer
    
    explanation = response.get("explanation") or "Here is what I found."
    result = response.get("result") or response.get("rows") or response.get("raw")

    if result is None:
        return explanation

    if isinstance(result, (dict, list)):
        try:
            result_text = json.dumps(result, indent=2)
        except Exception:
            result_text = str(result)
    else:
        result_text = str(result)

    return f"{explanation}\n\n{result_text}"


# Request/Response Models (Pydantic v2)
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")

class ChatSessionRequest(BaseModel):
    # User ID is optional; default to "anonymous" so unauthenticated users can start sessions
    user_id: Optional[str] = Field(default="anonymous", description="User ID (optional; defaults to 'anonymous')")
    initial_message: Optional[str] = Field(None, description="Initial user message")
    chat_mode: Optional[str] = Field(None, description="Chat mode: None (default booking agent) or 'booking_chat' (floating chat agent)")
    flow_type: Optional[str] = Field(None, description="Flow type: 'flights', 'hotels', 'cars' - sets the intent_type context")

class ChatSessionResponse(BaseModel):
    session_id: str
    user_id: str
    created_at: datetime
    messages: List[ChatMessage]
    context: Dict[str, Any]

class ChatMessageRequest(BaseModel):
    message: str = Field(..., description="User message")
    # Session ID is passed in the path; keep this optional so backend doesn't need to send it in the body
    session_id: Optional[str] = Field(default=None, description="Session ID (optional, taken from path)")

class ChatMessageResponse(BaseModel):
    session_id: str
    response: str
    bundles: Optional[List[Dict[str, Any]]] = None
    timestamp: datetime

class BundleRecommendation(BaseModel):
    bundle_id: str
    total_price: float
    fit_score: float
    why_this: str
    what_to_watch: str
    flight: Dict[str, Any]
    hotel: Dict[str, Any]

class BundleResponse(BaseModel):
    bundles: List[BundleRecommendation]

class WatchRequest(BaseModel):
    user_id: str
    bundle_id: Optional[str] = None
    deal_id: Optional[str] = None
    price_threshold: Optional[float] = None
    inventory_threshold: Optional[int] = None

class WatchResponse(BaseModel):
    watch_id: str
    user_id: str
    bundle_id: Optional[str]
    deal_id: Optional[str]
    price_threshold: Optional[float]
    inventory_threshold: Optional[int]
    active: bool
    created_at: datetime

class PolicyQuestionRequest(BaseModel):
    listing_id: str
    question_type: str = Field(..., description="cancellation, pets, parking, refund")

class PolicyAnswerResponse(BaseModel):
    listing_id: str
    question_type: str
    answer: str
    source: str

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    service: str
    version: str

class DetailedHealthResponse(HealthResponse):
    uptime_seconds: float
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_total_mb: float

class WebSocketEvent(BaseModel):
    event_type: str  # "deal_update", "watch_alert", "price_drop", "inventory_low"
    data: Dict[str, Any]
    timestamp: datetime

class PushDealRequest(BaseModel):
    deal_id: str = Field(..., description="Unique deal identifier")
    deal_type: str = Field(..., description="Type: 'flight', 'hotel', or 'car'")
    origin: Optional[str] = Field(None, description="Origin city/airport code (for flights/cars)")
    destination: str = Field(..., description="Destination city/airport code")
    city: Optional[str] = Field(None, description="City name (for hotels/cars)")
    listing_id: Optional[str] = Field(None, description="External listing ID")
    price: float = Field(..., description="Deal price")
    currency: str = Field(default="USD", description="Currency code")
    avg_30d_price: Optional[float] = Field(None, description="30-day average price for comparison")
    availability: Optional[int] = Field(None, description="Number of available seats/rooms/cars")
    is_limited: bool = Field(default=False, description="Whether this is a limited-time deal")
    tags: Optional[str] = Field(None, description="Pipe-separated tags (e.g., 'Flash Sale|Refundable')")
    airline: Optional[str] = Field(None, description="Airline name (for flights)")
    stops: Optional[int] = Field(None, description="Number of stops (for flights)")
    duration_hours: Optional[float] = Field(None, description="Flight duration in hours")
    neighborhood: Optional[str] = Field(None, description="Neighborhood (for hotels)")
    amenities: Optional[str] = Field(None, description="Pipe-separated amenities")
    pet_friendly: Optional[bool] = Field(None, description="Pet-friendly accommodation")
    breakfast_included: Optional[bool] = Field(None, description="Breakfast included")
    near_transit: Optional[bool] = Field(None, description="Near public transit")
    refundable: Optional[bool] = Field(None, description="Refundable booking")
    transit_score: Optional[int] = Field(None, description="Transit accessibility score")
    cancellation_policy: Optional[str] = Field(None, description="Cancellation policy name")
    refund_deadline: Optional[str] = Field(None, description="Refund deadline ISO timestamp")
    parking: Optional[str] = Field(None, description="Parking information")
    price_history: Optional[str] = Field(None, description="Pipe-separated price history")
    car_vendor: Optional[str] = Field(None, description="Car rental vendor")
    car_type: Optional[str] = Field(None, description="Car type (sedan, SUV, etc.)")
    transmission: Optional[str] = Field(None, description="Transmission type")
    fuel: Optional[str] = Field(None, description="Fuel type")
    limited_mileage: Optional[bool] = Field(None, description="Limited mileage plan")
    pickup_location: Optional[str] = Field(None, description="Pickup location")

class PushDealResponse(BaseModel):
    success: bool
    deal_id: str
    message: str
    deals_refreshed: int
    broadcast_sent: bool

# Startup event
start_time = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Concierge AI Service starting up...")
    print("Initializing deal cache...")
    cached_deals = load_deals_from_redis()
    if cached_deals:
        update_deal_cache(cached_deals)
    else:
        refreshed = refresh_deals_from_feed(reason="startup")
        if not refreshed:
            with Session(engine) as session:
                deals = session.exec(select(Deal).where(Deal.status == DealStatus.ACTIVE)).all()
                if not deals:
                    print("Generating mock deals...")
                    mock_deals = generate_mock_deals()
                    for deal in mock_deals:
                        session.add(deal)
                    session.commit()
                    deals = session.exec(select(Deal)).all()
                update_deal_cache(deals)
    print(f"Loaded {len(deal_cache)} deals into cache")
    
    asyncio.create_task(watch_monitor_task())
    asyncio.create_task(deal_feed_refresh_task())
    
    yield
    
    print("Concierge AI Service shutting down...")

app.router.lifespan_context = lifespan

@app.websocket("/events")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time event updates
    Relays watch alerts, deal updates, price drops, inventory changes
    """
    await manager.connect(websocket, session_id)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            # Echo back or handle client messages if needed
            await websocket.send_json({
                "type": "ack",
                "message": "Message received",
                "timestamp": datetime.now().isoformat()
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@app.post("/api/v1/concierge/sessions", response_model=ChatSessionResponse, tags=["Concierge AI"])
async def create_chat_session(request: ChatSessionRequest):
    """
    Create a new AI chat session for a user
    """
    user_identifier = request.user_id
    session_id = f"session_{user_identifier or 'anonymous'}_{int(time.time())}"
    
    messages = []
    context: Dict[str, Any] = {}
    if user_identifier:
        context["user_id"] = user_identifier
        if "@" in user_identifier:
            context.setdefault("user_email", user_identifier)
    
    # Set chat mode if provided
    if request.chat_mode:
        context["chat_mode"] = request.chat_mode
    
    # Set intent_type from flow_type if provided
    if request.flow_type:
        # Map plural flow_type to singular intent_type
        flow_to_intent = {
            "flights": "flight",
            "hotels": "hotel",
            "cars": "car"
        }
        context["intent_type"] = flow_to_intent.get(request.flow_type, request.flow_type.rstrip('s'))
    
    if request.initial_message:
        messages.append(ChatMessage(role="user", content=request.initial_message))
        # Parse intent
        constraints = intent_parser.parse_travel_request(request.initial_message)
        context.update(constraints)

        if should_use_langgraph(request.initial_message, context):
            ai_response = await generate_ai_response(request.initial_message, context)
        else:
            clarification = intent_parser.needs_clarification(constraints)
            if clarification:
                ai_response = clarification
            else:
                bundles = await build_bundles_from_constraints(constraints)
                if bundles:
                    ai_response = format_bundle_recommendation(bundles)
                else:
                    ai_response = await generate_ai_response(request.initial_message, constraints)

        messages.append(ChatMessage(role="assistant", content=ai_response))
    
    # Save session to database
    session = ChatSession(
        session_id=session_id,
        user_id=user_identifier or "anonymous",
        context=context
    )
    with Session(engine) as db_session:
        db_session.add(session)
        db_session.commit()
    
    return ChatSessionResponse(
        session_id=session_id,
        user_id=request.user_id,
        created_at=datetime.now(),
        messages=messages,
        context=context
    )

@app.post("/api/v1/concierge/sessions/{session_id}/messages", response_model=ChatMessageResponse, tags=["Concierge AI"])
async def send_message(session_id: str, request: ChatMessageRequest):
    """
    Send a message in an existing chat session
    Supports refinement: "Make it pet-friendly and avoid red-eye flights"
    """
    # Load session context
    with Session(engine) as db_session:
        session = db_session.exec(
            select(ChatSession).where(ChatSession.session_id == session_id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        context = session.context.copy() if session.context else {}
        if session.user_id:
            context.setdefault("user_id", session.user_id)
            if "@" in session.user_id:
                context.setdefault("user_email", session.user_id)
        
        # Parse new constraints (refinement)
        new_constraints = intent_parser.parse_travel_request(request.message, context)
        context.update(new_constraints)
        
        # Debug logging
        print(f"[DEBUG] Parsed context: {json.dumps(context, indent=2)}")
        
        # Update session context
        session.context = context
        session.updated_at = datetime.now()
        db_session.add(session)
        db_session.commit()
    
    # Generate response
    bundles = None
    bundle_data = None  # Initialize bundle_data
    message_lower = request.message.lower()
    
    # Booking-only chat mode: natural language answers using LangGraph for weather, search, etc.
    if context.get("chat_mode") == "booking_chat":
        # Pass deal cache context to the booking chat agent
        enriched_context = context.copy()
        
        # Add a clear instruction that this is a conversational chat
        enriched_context["is_chat_only"] = True
        
        if context.get("bundle_id") or context.get("deal_ids"):
            # Include deal information from cache
            deal_info = []
            if context.get("deal_ids"):
                for deal_id in context.get("deal_ids", []):
                    deal = deal_cache.get(deal_id)
                    if deal:
                        deal_info.append({
                            "deal_id": deal.deal_id,
                            "type": deal.deal_type.value,
                            "origin": deal.origin,
                            "destination": deal.destination,
                            "price": deal.price,
                            "metadata": deal.deal_metadata
                        })
            enriched_context["deals_context"] = deal_info
        
        # Use LangGraph agent for intelligent routing (weather, search, mongo, supabase)
        ai_response = await generate_ai_response(request.message, enriched_context)
        
        return ChatMessageResponse(
            session_id=session_id,
            response=ai_response,
            bundles=None,
            timestamp=datetime.now(),
        )

    # Check if message has travel planning intent OR if we're continuing a travel conversation
    has_travel_intent = any(word in message_lower for word in [
        "flight", "fly", "hotel", "stay", "car", "rental", "bundle", "package", 
        "trip", "travel", "vacation", "book", "destination", "visit"
    ])
    
    # Continue travel planning if we already have intent_type from previous messages
    # OR if the intent parser detected any travel-related information (dates, locations, etc.)
    in_travel_flow = (
        context.get("intent_type") is not None or
        context.get("check_in") is not None or
        context.get("origin") is not None or
        context.get("destination") is not None
    )
    
    # For travel intent, check if we have enough info before querying
    search_params = None
    search_params_complete = False
    
    if has_travel_intent or in_travel_flow:
        # First check if we need more information
        clarification = intent_parser.needs_clarification(context)
        if clarification:
            ai_response = clarification
        else:
            # Check if user wants flight-only or hotel-only
            intent_type = context.get("intent_type")
            
            if intent_type == "flight":
                # Query MongoDB directly for flights
                origin = context.get("origin")
                destination = context.get("destination")
                depart_date = context.get("check_in")
                
                matching_flights = await search_flights_mongo(
                    origin=origin,
                    destination=destination,
                    depart_date=depart_date,
                    limit=20
                )
                
                if matching_flights:
                    date_context = f" on {depart_date}" if depart_date else ""
                    trip_type = context.get('trip_type', 'one-way')
                    prices = [f.get("price", 0) for f in matching_flights if f.get("price")]
                    
                    ai_response = f"Found {len(matching_flights)} {trip_type} flight{'s' if len(matching_flights) > 1 else ''} from {origin} to {destination}{date_context}. Prices range from ${min(prices):.0f} to ${max(prices):.0f}. Check the results →"
                    
                    # Convert MongoDB flight docs to bundle format
                    bundle_data = []
                    for flight in matching_flights:
                        bundle_data.append({
                            "type": "flight",
                            "deal": {
                                "deal_id": flight.get("id") or flight.get("_id"),
                                "deal_type": "flight",
                                "origin": flight.get("from"),
                                "destination": flight.get("to"),
                                "price": flight.get("price"),
                                "currency": flight.get("currency", "USD"),
                                "availability": flight.get("availableSeats"),
                                "deal_metadata": {
                                    "airline": flight.get("airline"),
                                    "flight_number": flight.get("flightNumber"),
                                    "depart_date": flight.get("departDate"),
                                    "departure_time": flight.get("departureTime"),
                                    "arrival_time": flight.get("arrivalTime"),
                                    "duration_hours": flight.get("durationMinutes", 0) / 60,
                                    "stops": flight.get("stops", 0),
                                    "nonstop": flight.get("nonstop", False),
                                    "class": flight.get("class", "economy"),
                                    "trip_type": trip_type
                                },
                                "tags": []
                            }
                        })
                        if flight.get("nonstop"):
                            bundle_data[-1]["deal"]["tags"].append("Direct")
                        if flight.get("isDeal"):
                            bundle_data[-1]["deal"]["tags"].append("BestValue")
                else:
                    ai_response = "I couldn't find any flights matching your criteria."
            
            elif intent_type == "hotel":
                # Query MongoDB directly for hotels
                destination = context.get("destination")
                
                matching_hotels = await search_hotels_mongo(
                    city=destination,
                    limit=20
                )
                
                if matching_hotels:
                    date_context = ""
                    check_in = context.get('check_in')
                    check_out = context.get('check_out')
                    if check_in and check_out:
                        date_context = f" for {check_in} to {check_out}"
                    
                    prices = [h.get("pricePerNight", 0) for h in matching_hotels if h.get("pricePerNight")]
                    ai_response = f"Found {len(matching_hotels)} hotel{'s' if len(matching_hotels) > 1 else ''} in {destination}{date_context}. Prices range from ${min(prices):.0f} to ${max(prices):.0f}/night. Check the results →"
                    
                    # Convert MongoDB hotel docs to bundle format
                    bundle_data = []
                    for hotel in matching_hotels:
                        bundle_data.append({
                            "type": "hotel",
                            "deal": {
                                "deal_id": hotel.get("id") or hotel.get("_id"),
                                "deal_type": "hotel",
                                "destination": hotel.get("city"),
                                "price": hotel.get("pricePerNight"),
                                "currency": "USD",
                                "availability": hotel.get("availableRooms"),
                                "deal_metadata": {
                                    "name": hotel.get("name"),
                                    "city": hotel.get("city"),
                                    "state": hotel.get("state"),
                                    "country": hotel.get("country"),
                                    "neighbourhood": hotel.get("neighbourhood"),
                                    "rating": hotel.get("rating"),
                                    "amenities": hotel.get("amenities", []),
                                    "check_in": check_in,
                                    "check_out": check_out
                                },
                                "tags": hotel.get("amenities", [])[:3]  # First 3 amenities as tags
                            }
                        })
                else:
                    ai_response = "I couldn't find any hotels matching your criteria."
            
            elif intent_type == "car":
                # Query MongoDB directly for cars
                # For cars, the location could be in destination or origin
                destination = context.get("destination") or context.get("origin")
                
                # Handle city names (convert "New York" to just the city name for MongoDB)
                # MongoDB has exact city names, so we need to match them
                city_mapping = {
                    "New York": "New York",
                    "NYC": "New York",
                    "JFK": "New York",
                    "Boston": "Boston",
                    "BOS": "Boston",
                    "Miami": "Miami",
                    "MIA": "Miami",
                    "Philadelphia": "Philadelphia",
                    "Chicago": "Chicago",
                    "ORD": "Chicago",
                    "Los Angeles": "Los Angeles",
                    "LAX": "Los Angeles",
                    "San Francisco": "San Francisco",
                    "SFO": "San Francisco"
                }
                city = city_mapping.get(destination, destination)
                
                matching_cars = await search_cars_mongo(
                    city=city,
                    limit=20
                )
                
                if matching_cars:
                    date_context = ""
                    check_in = context.get('check_in')
                    check_out = context.get('check_out')
                    if check_in and check_out:
                        date_context = f" from {check_in} to {check_out}"
                    
                    prices = [c.get("pricePerDay", 0) for c in matching_cars if c.get("pricePerDay")]
                    ai_response = f"Found {len(matching_cars)} rental car{'s' if len(matching_cars) > 1 else ''} in {city}{date_context}. Prices range from ${min(prices):.0f} to ${max(prices):.0f}/day. Check the results →"
                    
                    # Convert MongoDB car docs to bundle format
                    bundle_data = []
                    for car in matching_cars:
                        bundle_data.append({
                            "type": "car",
                            "deal": {
                                "deal_id": car.get("id") or str(car.get("_id")),
                                "deal_type": "car",
                                "destination": car.get("city"),
                                "price": car.get("pricePerDay"),
                                "currency": "USD",
                                "availability": car.get("available", True),
                                "deal_metadata": {
                                    "city": car.get("city"),
                                    "vendor": car.get("vendor"),
                                    "type": car.get("type"),
                                    "seats": car.get("seats"),
                                    "transmission": car.get("transmission"),
                                    "features": car.get("features", []),
                                    "pickup_date": check_in,
                                    "dropoff_date": check_out
                                },
                                "tags": [car.get("type"), car.get("transmission")]
                            }
                        })
                else:
                    ai_response = "I couldn't find any rental cars matching your criteria."
            
            else:
                # Build bundles for multi-component trips
                bundle_data = await build_bundles_from_constraints(context)
                if bundle_data:
                    ai_response = format_bundle_recommendation_from_data(bundle_data, is_refinement=True)
                else:
                    ai_response = await generate_ai_response(request.message, context)
    else:
        # No travel intent, generate general response
        ai_response = await generate_ai_response(request.message, context)
    
    return ChatMessageResponse(
        session_id=session_id,
        response=ai_response,
        bundles=bundle_data,
        timestamp=datetime.now()
    )

@app.get("/api/v1/concierge/sessions/{session_id}", response_model=ChatSessionResponse, tags=["Concierge AI"])
async def get_chat_session(session_id: str):
    """Get chat session details"""
    with Session(engine) as db_session:
        session = db_session.exec(
            select(ChatSession).where(ChatSession.session_id == session_id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return ChatSessionResponse(
            session_id=session.session_id,
            user_id=session.user_id,
            created_at=session.created_at,
            messages=[],  # Could load from separate messages table
            context=session.context
        )

@app.get("/api/v1/concierge/bundles", response_model=BundleResponse, tags=["Bundles"])
async def get_bundles(
    user_id: Optional[str] = None,
    destination: Optional[str] = None,
    budget: Optional[float] = None,
    max_results: int = 3
):
    """
    Get flight+hotel bundles from cached deals
    Builds bundles with Fit Score calculation
    """
    constraints = {}
    if user_id:
        constraints["user_id"] = user_id
    if destination:
        constraints["destination"] = destination
    if budget:
        constraints["budget"] = budget
    
    bundles = await build_bundles_from_constraints(constraints, max_results)
    
    recommendations = [format_bundle_for_response(b) for b in bundles]
    
    return BundleResponse(bundles=recommendations)

@app.get("/api/v1/concierge/bundles/{bundle_id}", tags=["Bundles"])
async def get_bundle(bundle_id: str):
    """Get bundle details"""
    with Session(engine) as db_session:
        bundle = db_session.exec(
            select(Bundle).where(Bundle.bundle_id == bundle_id)
        ).first()
        
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle not found")
        
        # Load flight and hotel deals
        flight_deal = None
        hotel_deal = None
        if bundle.flight_deal_id:
            flight_deal = db_session.get(Deal, bundle.flight_deal_id)
        if bundle.hotel_deal_id:
            hotel_deal = db_session.get(Deal, bundle.hotel_deal_id)
        
        return format_bundle_for_response(bundle, flight_deal, hotel_deal)

@app.post("/api/v1/concierge/watches", response_model=WatchResponse, tags=["Watches"])
async def create_watch(request: WatchRequest):
    """
    Create a watch (price alert, availability alert)
    Example: "Track this Miami package; alert me if it dips below $850 or inventory drops under 5 rooms"
    """
    watch_id = f"watch_{request.user_id}_{int(time.time())}"
    
    watch = Watch(
        watch_id=watch_id,
        user_id=request.user_id,
        bundle_id=request.bundle_id,
        deal_id=request.deal_id,
        price_threshold=request.price_threshold,
        inventory_threshold=request.inventory_threshold,
        active=True
    )
    
    with Session(engine) as db_session:
        db_session.add(watch)
        db_session.commit()
        db_session.refresh(watch)
    
    return WatchResponse(
        watch_id=watch.watch_id,
        user_id=watch.user_id,
        bundle_id=watch.bundle_id,
        deal_id=watch.deal_id,
        price_threshold=watch.price_threshold,
        inventory_threshold=watch.inventory_threshold,
        active=watch.active,
        created_at=watch.created_at
    )

@app.get("/api/v1/concierge/watches", tags=["Watches"])
async def list_watches(user_id: Optional[str] = None):
    """List all watches, optionally filtered by user_id"""
    with Session(engine) as db_session:
        if user_id:
            watches = db_session.exec(
                select(Watch).where(Watch.user_id == user_id)
            ).all()
        else:
            watches = db_session.exec(select(Watch)).all()
        
        return {"watches": [w.dict() for w in watches]}

@app.post("/api/v1/concierge/query", tags=["Database Queries"])
async def execute_database_query(request: Dict[str, Any]):
    """
    Execute database query using MCP
    Allows AI concierge to answer questions by querying Supabase
    """
    user_question = request.get("question", "")
    context = request.get("context", {})
    
    if not user_question:
        raise HTTPException(status_code=400, detail="Question is required")
    
    if request.get("userId"):
        context.setdefault("user_id", request["userId"])
        if "@" in request["userId"]:
            context.setdefault("user_email", request["userId"])
    if request.get("userEmail"):
        context.setdefault("user_email", request["userEmail"])

    response = await supabase_langgraph_agent.ainvoke(user_question, context)

    if response.get("error"):
        raise HTTPException(
            status_code=500,
            detail=response.get("error"),
        )

    return {
        "question": user_question,
        "query": response.get("query"),
        "explanation": response.get("explanation"),
        "result": response.get("result"),
        "timestamp": datetime.now().isoformat(),
    }

@app.post("/api/v1/concierge/policy", response_model=PolicyAnswerResponse, tags=["Policy Q&A"])
async def get_policy_answer(request: PolicyQuestionRequest):
    """
    Answer policy questions from listing metadata
    Questions: cancellation, pets, parking, refund
    """
    # Find deal/listing
    with Session(engine) as db_session:
        deal = db_session.exec(
            select(Deal).where(Deal.listing_id == request.listing_id)
        ).first()
        
        if not deal:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Extract answer from metadata
        answer = extract_policy_answer(deal, request.question_type)
        
        return PolicyAnswerResponse(
            listing_id=request.listing_id,
            question_type=request.question_type,
            answer=answer,
            source="listing_metadata"
        )

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Basic health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        service="concierge-ai",
        version="2.0.0"
    )

@app.get("/health/detailed", response_model=DetailedHealthResponse, tags=["Health"])
async def detailed_health_check():
    """Detailed health check with system metrics"""
    uptime = time.time() - start_time
    memory = psutil.virtual_memory()
    
    return DetailedHealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        service="concierge-ai",
        version="2.0.0",
        uptime_seconds=uptime,
        cpu_percent=psutil.cpu_percent(interval=0.1),
        memory_percent=memory.percent,
        memory_used_mb=memory.used / (1024 * 1024),
        memory_total_mb=memory.total / (1024 * 1024)
    )

@app.get("/deals", tags=["Deals"])
async def get_deals(
    deal_type: Optional[str] = None,
    destination: Optional[str] = None,
    max_price: Optional[float] = None,
    limit: Optional[int] = None
):
    """Get current list of active deals with optional filters"""
    deals = list(deal_cache.values())
    
    # Apply filters
    if deal_type:
        try:
            deal_type_enum = DealType(deal_type.lower())
            deals = [d for d in deals if d.deal_type == deal_type_enum]
        except ValueError:
            pass
    
    if destination:
        deals = [d for d in deals if d.destination and destination.upper() in d.destination.upper()]
    
    if max_price:
        deals = [d for d in deals if d.price <= max_price]
    
    # Apply limit
    if limit and limit > 0:
        deals = deals[:limit]
    
    # Format deals for response
    deals_data = []
    for deal in deals:
        deal_data = {
            "deal_id": deal.deal_id,
            "deal_type": deal.deal_type.value if hasattr(deal.deal_type, 'value') else str(deal.deal_type),
            "origin": deal.origin,
            "destination": deal.destination,
            "listing_id": deal.listing_id,
            "price": deal.price,
            "currency": deal.currency,
            "avg_30d_price": deal.avg_30d_price,
            "availability": deal.availability,
            "is_limited": deal.is_limited,
            "tags": deal.tags or [],
            "deal_score": deal.deal_score,
            "status": deal.status.value if hasattr(deal.status, 'value') else str(deal.status) if deal.status else None,
            "metadata": deal.deal_metadata or {}
        }
        deals_data.append(deal_data)
    
    return {
        "total": len(deals_data),
        "deals": deals_data,
        "cache_size": len(deal_cache),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/deals/push", response_model=PushDealResponse, tags=["Deals"])
async def push_deal(deal: PushDealRequest):
    """Push a new deal to the CSV feed and broadcast to all WebSocket clients immediately"""
    import csv
    from pathlib import Path
    
    try:
        # Build CSV row from request
        csv_row = [
            deal.deal_id, deal.deal_type, deal.origin or "", deal.destination, deal.city or "",
            deal.listing_id or "", str(deal.price), deal.currency,
            str(deal.avg_30d_price) if deal.avg_30d_price else "",
            str(deal.availability) if deal.availability else "",
            "true" if deal.is_limited else "false", deal.tags or "", "", "active", "",
            deal.airline or "", str(deal.stops) if deal.stops is not None else "",
            str(deal.duration_hours) if deal.duration_hours else "",
            deal.neighborhood or "", deal.amenities or "",
            "true" if deal.pet_friendly else "", "true" if deal.breakfast_included else "",
            "true" if deal.near_transit else "", "true" if deal.refundable else "",
            str(deal.transit_score) if deal.transit_score else "",
            deal.cancellation_policy or "", deal.refund_deadline or "",
            deal.parking or "", deal.price_history or "",
            deal.car_vendor or "", deal.car_type or "", deal.transmission or "",
            deal.fuel or "", "true" if deal.limited_mileage else "",
            deal.pickup_location or ""
        ]
        
        # Append to CSV file
        base_dir = Path(__file__).resolve().parent / "data"
        csv_path = base_dir / "deals_feed.csv"
        
        with open(csv_path, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(csv_row)
        
        # Immediately refresh deals from feed
        deals_count = refresh_deals_from_feed(reason="push_api")
        
        # Get the newly added deal from cache
        new_deal = deal_cache.get(deal.deal_id)
        
        # Broadcast to all connected WebSocket clients
        if new_deal:
            deal_type_str = new_deal.deal_type.value if hasattr(new_deal.deal_type, 'value') else str(new_deal.deal_type)
            deal_data = {
                "deal_id": new_deal.deal_id,
                "deal_type": deal_type_str,
                "origin": new_deal.origin,
                "destination": new_deal.destination,
                "price": new_deal.price,
                "currency": new_deal.currency,
                "avg_30d_price": new_deal.avg_30d_price,
                "availability": new_deal.availability,
                "is_limited": new_deal.is_limited,
                "tags": new_deal.tags or []
            }
            
            await manager.broadcast_to_all({
                "type": "message",
                "role": "assistant",
                "content": f"🔥 Hot Deal Alert! {deal_type_str.title()} to {new_deal.destination} for ${new_deal.price}!",
                "deals": [deal_data],
                "timestamp": datetime.now().isoformat()
            })
            
            broadcast_sent = True
        else:
            broadcast_sent = False
        
        return PushDealResponse(
            success=True,
            deal_id=deal.deal_id,
            message=f"Deal added to feed and broadcast to {len(manager.active_connections)} active sessions",
            deals_refreshed=deals_count,
            broadcast_sent=broadcast_sent
        )
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in push_deal: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to push deal: {str(e)}")

@app.get("/health/ready", tags=["Health"])
async def readiness_check():
    """Readiness probe"""
    return {"status": "ready", "timestamp": datetime.now().isoformat()}

@app.get("/health/live", tags=["Health"])
async def liveness_check():
    """Liveness probe"""
    return {"status": "alive", "timestamp": datetime.now().isoformat()}

def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    value = value.replace("Z", "+00:00")
    return datetime.fromisoformat(value)

def serialize_deal_for_cache(deal: Deal) -> Dict[str, Any]:
    data = deal.model_dump()
    for field in ("created_at", "updated_at"):
        if isinstance(data.get(field), datetime):
            data[field] = data[field].isoformat()
    return data

def deserialize_deal_from_cache(payload: Dict[str, Any]) -> Deal:
    for field in ("created_at", "updated_at"):
        if payload.get(field):
            payload[field] = _parse_datetime(payload[field])
    return Deal(**payload)

def cache_deals_in_redis(deals: List[Deal]) -> None:
    if not redis_client:
        return
    try:
        serialized = [serialize_deal_for_cache(deal) for deal in deals]
        redis_client.setex(DEAL_CACHE_KEY, DEAL_REFRESH_SECONDS + 60, json.dumps(serialized))
    except Exception as exc:
        print(f"Failed to cache deals in Redis: {exc}")

def load_deals_from_redis() -> Optional[List[Deal]]:
    if not redis_client:
        return None
    try:
        cached = redis_client.get(DEAL_CACHE_KEY)
        if not cached:
            return None
        raw = json.loads(cached)
        return [deserialize_deal_from_cache(item) for item in raw]
    except Exception as exc:
        print(f"Failed to load deals from Redis: {exc}")
        return None

def update_deal_cache(deals: List[Deal]) -> None:
    """Replace in-memory cache with latest deals and push to Redis."""
    deal_cache.clear()
    for deal in deals:
        # Ensure deal_type and status are enums
        if isinstance(deal.deal_type, str):
            deal.deal_type = DealType(deal.deal_type)
        if isinstance(deal.status, str):
            deal.status = DealStatus(deal.status)
        deal_cache[deal.deal_id] = deal
    cache_deals_in_redis(deals)

def select_rotating_deals(deals: List[Deal]) -> List[Deal]:
    """Pick randomized subsets per deal type for the next rotation window."""
    grouped: Dict[DealType, List[Deal]] = defaultdict(list)
    for deal in deals:
        grouped[deal.deal_type].append(deal)
    
    selected: List[Deal] = []
    for deal_type, limit in DEAL_LIMITS.items():
        pool = grouped.get(deal_type, [])
        if not pool:
            continue
        random.shuffle(pool)
        if limit <= 0 or limit >= len(pool):
            selected.extend(pool)
        else:
            selected.extend(pool[:limit])
    
    return selected

def refresh_deals_from_feed(reason: str = "manual") -> int:
    """Reload deals from CSV feed, randomize, and persist to DB/cache."""
    tagged_deals = deal_ingestor.detect_and_tag_deals()
    if not tagged_deals:
        return 0
    
    selected = select_rotating_deals(tagged_deals)
    if not selected:
        return 0
    
    now = datetime.now()
    expiry = now + timedelta(seconds=DEAL_REFRESH_SECONDS)
    for deal in selected:
        deal.deal_metadata = deal.deal_metadata or {}
        deal.deal_metadata["promo_end"] = expiry.isoformat()
        deal.status = DealStatus.ACTIVE
        deal.created_at = now
        deal.updated_at = now
    
    with Session(engine) as db_session:
        # Upsert deals (update if exists, insert if new)
        for deal in selected:
            existing = db_session.exec(select(Deal).where(Deal.deal_id == deal.deal_id)).first()
            if existing:
                # Update existing deal
                for key, value in deal.dict(exclude_unset=True).items():
                    setattr(existing, key, value)
            else:
                # Add new deal
                db_session.add(deal)
        db_session.commit()
        persisted = db_session.exec(select(Deal)).all()
    
    update_deal_cache(persisted)
    print(f"[{reason}] refreshed {len(persisted)} rotating deals from feed")
    return len(persisted)

async def deal_feed_refresh_task():
    """Background task to rotate deals based on the CSV feed."""
    while True:
        await asyncio.sleep(DEAL_REFRESH_SECONDS)
        try:
            refreshed = refresh_deals_from_feed(reason="scheduled")
            if not refreshed:
                print("[scheduled] No deals loaded from feed; retaining current cache")
        except Exception as exc:
            print(f"Error refreshing deals from feed: {exc}")

async def build_bundles_from_constraints(
    constraints: Dict[str, Any],
    max_results: int = 3
) -> List[Dict[str, Any]]:
    """Build bundles from user constraints and return as formatted dictionaries"""
    # Get flights and hotels from cache
    flights = [d for d in deal_cache.values() if d.deal_type == DealType.FLIGHT]
    hotels = [d for d in deal_cache.values() if d.deal_type == DealType.HOTEL]
    
    # Add user_id if not present
    if "user_id" not in constraints:
        constraints["user_id"] = "anonymous"
    
    bundles = BundleBuilder.build_bundles(
        flights=flights,
        hotels=hotels,
        user_constraints=constraints,
        max_results=max_results
    )
    
    # Save bundles to database and format them in the same session
    bundle_data = []
    with Session(engine) as db_session:
        for bundle in bundles:
            db_session.add(bundle)
        db_session.commit()
        
        # Format bundles while still in session
        for bundle in bundles:
            db_session.refresh(bundle)  # Ensure all attributes are loaded
            flight_deal = db_session.get(Deal, bundle.flight_deal_id)
            hotel_deal = db_session.get(Deal, bundle.hotel_deal_id)
            bundle_data.append(format_bundle_for_response(bundle, flight_deal, hotel_deal))
    
    return bundle_data

def format_bundle_recommendation(bundles: List[Bundle], is_refinement: bool = False) -> str:
    """Format bundle recommendations as natural language"""
    if not bundles:
        return "I couldn't find any matching bundles. Try adjusting your criteria."
    
    intro = "Here are some great options" + (" (updated)" if is_refinement else "") + ":\n\n"
    
    responses = []
    for i, bundle in enumerate(bundles[:3], 1):
        response = f"{i}. ${bundle.total_price:.0f} - {bundle.why_this} {bundle.what_to_watch}"
        responses.append(response)
    
    return intro + "\n".join(responses)

def format_bundle_recommendation_from_data(bundle_data: List[Dict[str, Any]], is_refinement: bool = False) -> str:
    """Format bundle recommendations from data dictionaries"""
    if not bundle_data:
        return "I couldn't find any matching bundles. Try adjusting your criteria."
    
    intro = "Here are some great options" + (" (updated)" if is_refinement else "") + ":\n\n"
    
    responses = []
    for i, bundle in enumerate(bundle_data[:3], 1):
        response = f"{i}. ${bundle['total_price']:.0f} - {bundle.get('why_this', '')} {bundle.get('what_to_watch', '')}"
        responses.append(response)
    
    return intro + "\n".join(responses)

def format_bundle_for_response(
    bundle: Bundle,
    flight_deal: Deal,
    hotel_deal: Deal
) -> Dict[str, Any]:
    """Format bundle for API response (must be called within a session)"""
    return {
        "bundle_id": bundle.bundle_id,
        "total_price": bundle.total_price,
        "fit_score": bundle.fit_score,
        "why_this": bundle.why_this,
        "what_to_watch": bundle.what_to_watch,
        "flight": {
            "deal_id": flight_deal.deal_id if flight_deal else None,
            "origin": flight_deal.origin if flight_deal else None,
            "destination": flight_deal.destination if flight_deal else None,
            "price": flight_deal.price if flight_deal else 0,
            "tags": flight_deal.tags if flight_deal else []
        },
        "hotel": {
            "deal_id": hotel_deal.deal_id if hotel_deal else None,
            "listing_id": hotel_deal.listing_id if hotel_deal else None,
            "destination": hotel_deal.destination if hotel_deal else None,
            "price": hotel_deal.price if hotel_deal else 0,
            "tags": hotel_deal.tags if hotel_deal else [],
            "availability": hotel_deal.availability if hotel_deal else None
        }
    }

def extract_policy_answer(deal: Deal, question_type: str) -> str:
    """Extract policy answer from deal metadata"""
    metadata = deal.deal_metadata
    
    if question_type == "cancellation":
        policy = metadata.get("cancellation_policy", "Standard cancellation policy applies")
        refund_deadline = metadata.get("refund_deadline")
        if refund_deadline:
            return f"Cancellation allowed until {refund_deadline}. {policy}"
        return policy
    
    elif question_type == "pets":
        pet_friendly = metadata.get("pet_friendly") or "Pet-friendly" in deal.tags
        if pet_friendly:
            return "Pets are allowed. Please check for any additional fees."
        return "Pets are not allowed at this property."
    
    elif question_type == "parking":
        parking = metadata.get("parking")
        if parking:
            return f"Parking: {parking}"
        return "Parking information not available."
    
    elif question_type == "refund":
        refundable = metadata.get("refundable") or "Refundable" in deal.tags
        if refundable:
            refund_window = metadata.get("refund_window", "within 24 hours")
            return f"Refundable {refund_window} of booking."
        return "Non-refundable booking."
    
    return "Policy information not available."

async def generate_ai_response(user_message: str, context: Dict[str, Any]) -> str:
    """Generate AI response using the LangGraph agent or fallback prompts."""
    message_lower = user_message.lower()

    is_db_query = looks_like_db_question(user_message)
    needs_supabase = is_supabase_question(user_message) or is_db_query
    needs_weather = is_weather_question(user_message)
    needs_search = is_search_question(user_message)
    needs_mongo = is_mongo_question(user_message) or context_ready_for_mongo(context)
    
    # In booking_chat mode, ALWAYS use LangGraph so it can route intelligently
    # (weather, search, mongo, supabase) with fallback to search for general questions
    is_booking_chat = context.get("chat_mode") == "booking_chat"
    needs_langgraph = is_booking_chat or needs_supabase or needs_weather or needs_search or needs_mongo

    if needs_langgraph:
        if needs_supabase and not context.get("user_id"):
            return "Please log in to view personal bookings, payments, reviews, or deals."
        try:
            agent_response = await supabase_langgraph_agent.ainvoke(
                user_message,
                context or {},
            )
            if not agent_response:
                return "I'm having trouble fetching that information right now."
            
            # Handle errors with friendly messages in booking_chat mode
            if agent_response.get("error"):
                error_msg = agent_response.get("error") or "I'm having trouble fetching that information right now."
                if is_booking_chat:
                    # Provide user-friendly error messages in chat mode
                    if "log in" in error_msg.lower():
                        return error_msg
                    elif "not configured" in error_msg.lower():
                        return "I'm having trouble accessing that information right now. Please try again later."
                    else:
                        return "I'm sorry, I couldn't retrieve that information. Could you try rephrasing your question?"
                return error_msg

            source = agent_response.get("source")
            chat_mode = context.get("chat_mode")
            if source == "supabase":
                return format_supabase_response(agent_response, chat_mode)
            return format_generic_agent_response(agent_response, chat_mode)
        except Exception as exc:
            return f"I ran into an error while answering that: {exc}"

    # If in booking chat mode with deal context, provide context-aware responses
    deals_context = context.get("deals_context", [])
    if deals_context:
        # Construct deal summary for the AI
        deal_summary = []
        for deal in deals_context:
            if deal["type"] == "flight":
                deal_summary.append(f"Flight from {deal['origin']} to {deal['destination']} for ${deal['price']}")
            elif deal["type"] == "hotel":
                deal_summary.append(f"Hotel in {deal['destination']} for ${deal['price']}/night")
        
        if deal_summary:
            deals_text = "\n".join(deal_summary)
            return f"I'm here to help with your booking. You're considering:\n{deals_text}\n\nWhat would you like to know? I can help with amenities, policies, payment options, or any other questions."
    
    # Simple conversational responses for non-database queries
    if any(word in message_lower for word in ["flight", "fly"]):
        return "I can help you find flights! What's your destination and travel dates?"
    elif any(word in message_lower for word in ["hotel", "stay"]):
        return "I'd be happy to help you find a hotel! Where would you like to stay?"
    elif any(word in message_lower for word in ["bundle", "package"]):
        return "Great! I can create a travel bundle. What are your travel dates and budget?"
    else:
        return "Hello! I'm your travel concierge. I can help you find flights, hotels, create bundles, and answer questions about bookings. How can I assist you?"

async def watch_monitor_task():
    """Background task to monitor watches and send WebSocket updates"""
    while True:
        await asyncio.sleep(30)  # Check every 30 seconds
        
        with Session(engine) as db_session:
            active_watches = db_session.exec(
                select(Watch).where(Watch.active == True)
            ).all()
            
            for watch in active_watches:
                # Check price threshold
                if watch.price_threshold:
                    deal = deal_cache.get(watch.deal_id) if watch.deal_id else None
                    if deal and deal.price <= watch.price_threshold:
                        await manager.broadcast_to_session(
                            watch.user_id,
                            {
                                "event_type": "price_drop",
                                "data": {
                                    "watch_id": watch.watch_id,
                                    "deal_id": watch.deal_id,
                                    "current_price": deal.price,
                                    "threshold": watch.price_threshold
                                },
                                "timestamp": datetime.now().isoformat()
                            }
                        )
                
                # Check inventory threshold
                if watch.inventory_threshold:
                    deal = deal_cache.get(watch.deal_id) if watch.deal_id else None
                    if deal and deal.availability and deal.availability <= watch.inventory_threshold:
                        await manager.broadcast_to_session(
                            watch.user_id,
                            {
                                "event_type": "inventory_low",
                                "data": {
                                    "watch_id": watch.watch_id,
                                    "deal_id": watch.deal_id,
                                    "current_availability": deal.availability,
                                    "threshold": watch.inventory_threshold
                                },
                                "timestamp": datetime.now().isoformat()
                            }
                        )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
