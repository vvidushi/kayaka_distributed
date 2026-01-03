"""
Concierge AI & Health Monitoring Service
Multi-agent travel concierge with deal detection, bundle building, and WebSocket updates
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
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
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from redis import Redis

# Health check imports
import psutil
import time

# Local imports
from models import Deal, Bundle, Watch, ChatSession, DealType, DealStatus
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
        for conn, session_id in disconnected:
            self.disconnect(conn, session_id)

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

# CSV File Watcher for deals_feed.csv
class DealsFeedHandler(FileSystemEventHandler):
    """Watch deals_feed.csv for changes and trigger deal refresh"""
    def __init__(self, feed_path: Path):
        self.feed_path = feed_path
        self.last_modified = 0
    
    def on_modified(self, event):
        if event.src_path == str(self.feed_path):
            # Debounce rapid file changes
            current_time = time.time()
            if current_time - self.last_modified < 2:  # 2 second debounce
                return
            self.last_modified = current_time
            
            print(f"Detected changes in {self.feed_path.name}, refreshing deals...")
            asyncio.create_task(refresh_and_notify_deals("csv_watcher"))

file_observer: Optional[Observer] = None

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


def looks_like_db_question(message: str) -> bool:
    lower = message.lower()
    return any(keyword in lower for keyword in DB_QUERY_KEYWORDS)


def is_search_question(message: str) -> bool:
    lower = message.lower()
    return any(keyword in lower for keyword in SEARCH_KEYWORDS)


def context_ready_for_mongo(context: Optional[Dict[str, Any]]) -> bool:
    """Check if context has enough info to query MongoDB (budget is optional)"""
    if not context:
        return False
    intent_type = context.get("intent_type", "")
    destination = context.get("destination") or context.get("city") or context.get("to")
    has_dates = bool(context.get("check_in") and context.get("check_out"))
    
    # For flights, also need origin
    if "flight" in intent_type or "fly" in intent_type:
        origin = context.get("origin") or context.get("from")
        return bool(origin and destination and has_dates)
    
    # For hotels and cars, just need destination and dates
    return bool(destination and has_dates)


def should_use_langgraph(message: str, context: Optional[Dict[str, Any]] = None) -> bool:
    return (
        is_supabase_question(message)
        or looks_like_db_question(message)
        or is_weather_question(message)
        or is_search_question(message)
        or is_mongo_question(message)
        or context_ready_for_mongo(context)
    )


def format_supabase_response(response: Dict[str, Any]) -> str:
    """Return conversational answer for Supabase results, preferring LLM summaries."""
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

    llm_answer = response.get("llm_answer")
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


def format_generic_agent_response(response: Dict[str, Any]) -> str:
    """Return readable answer for weather/search tool calls."""
    explanation = response.get("explanation") or response.get("llm_answer") or "Here is what I found."
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
    chat_mode: Optional[str] = Field(
        default=None,
        description="Chat mode; e.g., 'booking_chat' to force natural-language booking Q&A without actions.",
    )

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
    search_params: Optional[Dict[str, Any]] = None
    search_params_complete: bool = False
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

# Startup event
start_time = time.time()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global file_observer
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
    
    # Start CSV file watcher
    feed_path = Path(__file__).resolve().parent / "data" / "deals_feed.csv"
    if feed_path.exists():
        event_handler = DealsFeedHandler(feed_path)
        file_observer = Observer()
        file_observer.schedule(event_handler, str(feed_path.parent), recursive=False)
        file_observer.start()
        print(f"Watching {feed_path.name} for changes...")
    else:
        print(f"Warning: {feed_path} not found, file watcher disabled")
    
    asyncio.create_task(watch_monitor_task())
    asyncio.create_task(deal_feed_refresh_task())
    
    yield
    
    # Stop file watcher
    if file_observer:
        file_observer.stop()
        file_observer.join()
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
    if request.chat_mode:
        context["chat_mode"] = request.chat_mode
    if user_identifier:
        context["user_id"] = user_identifier
        if "@" in user_identifier:
            context.setdefault("user_email", user_identifier)
    
    if request.initial_message:
        messages.append(ChatMessage(role="user", content=request.initial_message))
        # Parse intent
        constraints = IntentParser.parse_travel_request(request.initial_message)
        context.update(constraints)

        if should_use_langgraph(request.initial_message, context):
            ai_response = await generate_ai_response(request.initial_message, context)
        else:
            clarification = IntentParser.needs_clarification(constraints)
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
        new_constraints = IntentParser.parse_travel_request(request.message, context)
        context.update(new_constraints)
        
        # Update session context
        session.context = context
        session.updated_at = datetime.now()
        db_session.add(session)
        db_session.commit()
    
    # Generate response
    bundles = None
    message_lower = request.message.lower()
    
    # Booking-only chat mode: natural language answers, no actions
    if context.get("chat_mode") == "booking_chat":
        ai_response = await generate_booking_chat_response(request.message, context)
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
    in_travel_flow = context.get("intent_type") is not None
    
    # For travel intent, check if we have enough info before querying
    search_params = None
    search_params_complete = False
    
    if has_travel_intent or in_travel_flow:
        # First check if we need more information
        clarification = IntentParser.needs_clarification(context)
        if clarification:
            ai_response = clarification
        else:
            # We have complete info - prepare search params for frontend
            intent_type = context.get("intent_type", "")
            
            if "flight" in intent_type:
                # Format dates to YYYY-MM-DD (remove time component)
                depart_date = context.get("check_in", "")
                return_date = context.get("check_out")
                if depart_date and "T" in depart_date:
                    depart_date = depart_date.split("T")[0]
                if return_date and "T" in return_date:
                    return_date = return_date.split("T")[0]
                
                search_params = {
                    "from": context.get("origin"),
                    "to": context.get("destination"),
                    "departDate": depart_date,
                    "returnDate": return_date,
                    "passengers": context.get("travelers", 1)
                }
                search_params_complete = True
                ai_response = f"Great! I found your flight details:\n\n✈️ From: {search_params['from']}\n✈️ To: {search_params['to']}\n📅 Departure: {search_params['departDate']}\n{('📅 Return: ' + search_params['returnDate']) if search_params['returnDate'] else '🎫 One-way trip'}\n\nSearching for available flights..."
            
            elif "hotel" in intent_type:
                # Format dates to YYYY-MM-DD
                check_in = context.get("check_in", "")
                check_out = context.get("check_out", "")
                if check_in and "T" in check_in:
                    check_in = check_in.split("T")[0]
                if check_out and "T" in check_out:
                    check_out = check_out.split("T")[0]
                
                search_params = {
                    "city": context.get("city") or context.get("destination"),
                    "checkIn": check_in,
                    "checkOut": check_out,
                    "guests": context.get("travelers", 1)
                }
                search_params_complete = True
                ai_response = f"Perfect! Here are your hotel search details:\n\n🏨 Location: {search_params['city']}\n📅 Check-in: {search_params['checkIn']}\n📅 Check-out: {search_params['checkOut']}\n👥 Guests: {search_params['guests']}\n\nSearching for available hotels..."
            
            elif "car" in intent_type:
                # Format dates to YYYY-MM-DD
                pick_up = context.get("check_in", "")
                drop_off = context.get("check_out", "")
                if pick_up and "T" in pick_up:
                    pick_up = pick_up.split("T")[0]
                if drop_off and "T" in drop_off:
                    drop_off = drop_off.split("T")[0]
                
                search_params = {
                    "location": context.get("city") or context.get("destination"),
                    "pickUp": pick_up,
                    "dropOff": drop_off
                }
                search_params_complete = True
                ai_response = f"Excellent! Your car rental details:\n\n🚗 Location: {search_params['location']}\n📅 Pick-up: {search_params['pickUp']}\n📅 Drop-off: {search_params['dropOff']}\n\nFinding available vehicles..."
            else:
                # Fallback to bundle or general response
                bundles = await build_bundles_from_constraints(context)
                if bundles:
                    ai_response = format_bundle_recommendation(bundles, is_refinement=True)
                else:
                    ai_response = await generate_ai_response(request.message, context)
    elif should_use_langgraph(request.message, context):
        # Database queries (bookings, payments, reviews, weather, search)
        ai_response = await generate_ai_response(request.message, context)
    else:
        # Natural conversation for greetings and general messages
        ai_response = await generate_ai_response(request.message, context)
    
    # Format bundles for response
    bundle_data = None
    if bundles:
        bundle_data = [format_bundle_for_response(b) for b in bundles]
    
    return ChatMessageResponse(
        session_id=session_id,
        response=ai_response,
        bundles=bundle_data,
        search_params=search_params,
        search_params_complete=search_params_complete,
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

@app.post("/api/v1/deals/refresh", tags=["Deals"])
async def trigger_deal_refresh():
    """Manually trigger deal refresh from CSV feed"""
    try:
        count = refresh_deals_from_feed(reason="manual_api")
        
        # Broadcast to all active WebSocket connections
        with Session(engine) as db_session:
            active_deals = db_session.exec(
                select(Deal).where(Deal.status == DealStatus.ACTIVE)
            ).all()
            
            # Send notification to all sessions
            for session_id in list(manager.active_connections.keys()):
                await manager.broadcast_to_session(
                    session_id,
                    {
                        "event_type": "deals_refreshed",
                        "data": {
                            "count": len(active_deals),
                            "deals": [
                                {
                                    "deal_id": deal.deal_id,
                                    "deal_type": deal.deal_type.value if hasattr(deal.deal_type, 'value') else str(deal.deal_type),
                                    "origin": deal.origin,
                                    "destination": deal.destination,
                                    "price": deal.price,
                                    "avg_price": deal.avg_30d_price,
                                    "savings_percent": round(((deal.avg_30d_price - deal.price) / deal.avg_30d_price * 100), 1) if deal.avg_30d_price else 0,
                                    "availability": deal.availability,
                                    "tags": deal.tags,
                                }
                                for deal in active_deals[:5]  # Send first 5 deals
                            ]
                        },
                        "timestamp": datetime.now().isoformat()
                    }
                )
        
        return {
            "status": "success",
            "deals_refreshed": count,
            "message": f"Refreshed {count} deals and notified active sessions"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh deals: {str(e)}")

@app.get("/api/v1/deals", tags=["Deals"])
async def get_active_deals(limit: int = 20):
    """Get currently active deals"""
    with Session(engine) as db_session:
        deals = db_session.exec(
            select(Deal)
            .where(Deal.status == DealStatus.ACTIVE)
            .limit(limit)
        ).all()
        
        return {
            "count": len(deals),
            "deals": [
                {
                    "deal_id": deal.deal_id,
                    "deal_type": deal.deal_type.value if hasattr(deal.deal_type, 'value') else str(deal.deal_type),
                    "origin": deal.origin,
                    "destination": deal.destination,
                    "listing_id": deal.listing_id,
                    "price": deal.price,
                    "avg_price": deal.avg_30d_price,
                    "savings_percent": round(((deal.avg_30d_price - deal.price) / deal.avg_30d_price * 100), 1) if deal.avg_30d_price else 0,
                    "currency": deal.currency,
                    "availability": deal.availability,
                    "is_limited": deal.is_limited,
                    "tags": deal.tags,
                    "deal_score": deal.deal_score,
                    "created_at": deal.created_at.isoformat() if deal.created_at else None,
                }
                for deal in deals
            ]
        }

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
        db_session.exec(delete(Deal))
        for deal in selected:
            db_session.add(deal)
        db_session.commit()
        persisted = db_session.exec(select(Deal)).all()
    
    update_deal_cache(persisted)
    print(f"[{reason}] refreshed {len(persisted)} rotating deals from feed")
    return len(persisted)

async def refresh_and_notify_deals(reason: str = "manual") -> None:
    """Refresh deals and broadcast notifications to all connected WebSocket clients"""
    try:
        count = refresh_deals_from_feed(reason)
        if count > 0:
            # Get active deals to broadcast
            active_deals = [d for d in deal_cache.values() if d.status == DealStatus.ACTIVE][:5]
            
            # Format deal message for chat
            deal_messages = []
            for deal in active_deals:
                if deal.deal_type == DealType.FLIGHT:
                    msg = f"{deal.origin} to {deal.destination}: ${deal.price:.0f}"
                    if deal.avg_30d_price:
                        savings = ((deal.avg_30d_price - deal.price) / deal.avg_30d_price * 100)
                        msg += f" ({savings:.0f}% OFF)"
                elif deal.deal_type == DealType.HOTEL:
                    msg = f"{deal.destination}: ${deal.price:.0f}/night"
                    if deal.avg_30d_price:
                        savings = ((deal.avg_30d_price - deal.price) / deal.avg_30d_price * 100)
                        msg += f" ({savings:.0f}% OFF)"
                else:
                    msg = f"{deal.destination}: ${deal.price:.0f}/day"
                
                if deal.is_limited and deal.availability:
                    msg += f" - Only {deal.availability} left!"
                
                deal_messages.append(msg)
            
            # Broadcast as assistant message to all connected clients
            notification = {
                "type": "message",
                "role": "assistant",
                "content": f"**New Hot Deals Just Dropped!**\\n\\n" + "\\n".join(deal_messages) + f"\\n\\nThese are limited-time offers. Want details on any of these?",
                "deals": [serialize_deal_for_cache(d) for d in active_deals]
            }
            
            await manager.broadcast_to_all(notification)
            print(f"Broadcasted {count} deals to all connected clients")
    except Exception as exc:
        print(f"Error refreshing and notifying deals: {exc}")

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
) -> List[Bundle]:
    """Build bundles from user constraints"""
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
    
    # Save bundles to database
    with Session(engine) as db_session:
        for bundle in bundles:
            db_session.add(bundle)
        db_session.commit()
    
    return bundles

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

def format_bundle_for_response(
    bundle: Bundle,
    flight_deal: Optional[Deal] = None,
    hotel_deal: Optional[Deal] = None
) -> Dict[str, Any]:
    """Format bundle for API response"""
    with Session(engine) as db_session:
        if not flight_deal:
            flight_deal = db_session.get(Deal, bundle.flight_deal_id)
        if not hotel_deal:
            hotel_deal = db_session.get(Deal, bundle.hotel_deal_id)
    
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
    needs_langgraph = needs_supabase or needs_weather or needs_search or needs_mongo

    if context.get("chat_mode") == "booking_chat" and supabase_langgraph_agent.llm:
        return await generate_booking_chat_response(user_message, context)

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
            if agent_response.get("error"):
                return agent_response.get("error") or "I'm having trouble fetching that information right now."

            source = agent_response.get("source")
            if source == "supabase":
                return format_supabase_response(agent_response)
            return format_generic_agent_response(agent_response)
        except Exception as exc:
            return f"I ran into an error while answering that: {exc}"

    # Use LLM for natural conversational responses
    if supabase_langgraph_agent.llm:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            
            system_prompt = """You are a friendly travel concierge assistant for a Kayak-like travel platform. 
You help users with:
- Finding flights, hotels, and car rentals
- Creating travel bundles and packages
- Answering questions about their bookings, payments, and reviews
- Providing travel recommendations

Be conversational, helpful, and concise. If users greet you or make small talk, respond naturally.
If they mention travel needs, gently guide them to provide details like destination, dates, and budget."""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_message)
            ]
            
            response = await supabase_langgraph_agent.llm.ainvoke(messages)
            return response.content
        except Exception as exc:
            # Fallback to simple response if LLM fails
            return "Hello! I'm your travel concierge. I can help you find flights, hotels, create bundles, and answer questions about bookings. How can I assist you?"
    
    # Fallback if no LLM available
    return "Hello! I'm your travel concierge. I can help you find flights, hotels, create bundles, and answer questions about bookings. How can I assist you?"


async def generate_booking_chat_response(user_message: str, context: Dict[str, Any]) -> str:
    """Lightweight bookings chat: natural language answers only, no booking actions or JSON."""
    llm = supabase_langgraph_agent.llm
    if not llm:
        return "I can answer booking-related questions, but my chat model is unavailable right now."

    from langchain_core.messages import SystemMessage, HumanMessage

    lower = user_message.lower()
    booking_intent = any(
        keyword in lower
        for keyword in [
            "booking",
            "bookings",
            "reservation",
            "previous booking",
            "past trip",
            "upcoming",
            "flight",
            "hotel",
            "stay",
            "ticket",
        ]
    )

    # If logged in and asking about bookings, try the LangGraph path for structured answers
    if booking_intent and context.get("user_id"):
        try:
            agent_response = await supabase_langgraph_agent.ainvoke(
                user_message,
                context or {},
            )
            if not agent_response:
                raise RuntimeError("Empty agent response.")
            if agent_response.get("error"):
                raise RuntimeError(agent_response.get("error"))

            source = agent_response.get("source")
            if source == "supabase":
                return format_supabase_response(agent_response)
            return format_generic_agent_response(agent_response)
        except Exception:
            # Fall through to LLM response below
            pass

    system_prompt = """You are a bookings Q&A assistant.
- Answer in concise natural language.
- You do NOT create or modify bookings.
- You can suggest flights or stays and provide helpful links like /flights, /hotels, /bookings, or relevant web URLs.
- Never return JSON, code, or bullet dumps of raw data. Keep it conversational."""

    # Add lightweight user context to help the LLM answer about known bookings
    user_ctx = context.get("user_context") or {}
    booking_count = user_ctx.get("bookingCount") or user_ctx.get("bookings_count")
    recent_bookings = user_ctx.get("bookings") or []
    context_snippet = ""
    if booking_count or recent_bookings:
        context_snippet = f"User has {booking_count or len(recent_bookings)} known booking(s). Summarize if asked. "

    messages = [
        SystemMessage(content=system_prompt + "\n" + context_snippet),
        HumanMessage(content=user_message),
    ]

    try:
        response = await llm.ainvoke(messages)
        return response.content
    except Exception:
        return "I hit a snag answering that booking question. Try again in a moment."

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
