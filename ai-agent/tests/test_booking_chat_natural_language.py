"""
Comprehensive tests for booking_chat mode natural language responses.
Validates that responses are conversational and don't contain SQL/MongoDB queries.
Tests with authenticated user jane@example.com.
"""
import pytest
import httpx
import re
from typing import Dict, Any


BASE_URL = "http://localhost:8000/api/v1/concierge"
TEST_USER = "692d51b0566e4de29f52a92c"  # jane@example.com


def has_sql_query(text: str) -> bool:
    """Check if text contains SQL query patterns."""
    sql_patterns = [
        r'\bSELECT\b.*\bFROM\b',
        r'\bINSERT\b.*\bINTO\b',
        r'\bUPDATE\b.*\bSET\b',
        r'\bDELETE\b.*\bFROM\b',
        r'\bWHERE\b.*=',
        r'\bJOIN\b',
        r'\bLIMIT\b\s+\d+',
        r'\bORDER BY\b',
    ]
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in sql_patterns)


def has_mongo_query(text: str) -> bool:
    """Check if text contains MongoDB query patterns."""
    mongo_patterns = [
        r'db\.\w+\.find',
        r'db\.\w+\.aggregate',
        r'\$match',
        r'\$group',
        r'\$project',
        r'\$sort',
        r'\$limit',
        r'collection:',
        r'filters:',
    ]
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in mongo_patterns)


def is_natural_language(text: str) -> bool:
    """Validate text is conversational natural language."""
    if not text or len(text.strip()) < 10:
        return False
    
    # Should not contain technical query syntax
    if has_sql_query(text) or has_mongo_query(text):
        return False
    
    # Should not contain raw JSON arrays/objects
    if text.strip().startswith('[') or text.strip().startswith('{'):
        return False
    
    # Should contain words (not just symbols/numbers)
    word_count = len(re.findall(r'\b[a-zA-Z]+\b', text))
    return word_count >= 5


async def send_booking_chat_message(session_id: str, message: str, timeout: float = 45.0) -> Dict[str, Any]:
    """Send a message in booking_chat mode and return response."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{BASE_URL}/sessions/{session_id}/messages",
            json={"message": message}
        )
        assert response.status_code == 200
        result = response.json()
        
        # Print question and response for verification
        print(f"\n{'='*80}")
        print(f"Q: {message}")
        print(f"{'-'*80}")
        print(f"A: {result.get('response', 'N/A')}")
        print(f"{'='*80}\n")
        
        return result


class TestBookingChatNaturalLanguage:
    """Test booking_chat mode returns only natural language responses."""
    
    async def create_session(self):
        """Create a booking_chat session for testing."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/sessions",
                json={
                    "user_id": TEST_USER,
                    "chat_mode": "booking_chat"
                }
            )
            assert response.status_code == 200, f"Failed to create session: {response.text}"
            data = response.json()
            return data["session_id"]
    
    # General Questions
    @pytest.mark.asyncio
    async def test_general_what_services(self):
        """Test 'What services do you offer?' returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What services do you offer?")
        
        assert result["bundles"] is None, "Should not return bundles in booking_chat"
        assert is_natural_language(result["response"]), f"Expected natural language, got: {result['response'][:200]}"
        # Check for service-related words
        response_lower = result["response"].lower()
        assert any(word in response_lower for word in ["plan", "search", "book", "help", "service", "assist"])
    
    @pytest.mark.asyncio
    async def test_general_how_can_help(self):
        """Test 'How can you help me?' returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "How can you help me?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert not has_sql_query(result["response"]), f"Found SQL in: {result['response']}"
        assert not has_mongo_query(result["response"]), f"Found MongoDB query in: {result['response']}"
    
    # Weather Questions
    @pytest.mark.asyncio
    async def test_weather_boston(self):
        """Test weather query returns natural language with travel tips."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What is the weather like in Boston in December?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        # Check for weather-related content (temperature symbols, degrees, conditions, etc.)
        response_lower = result["response"].lower()
        assert any(word in response_lower for word in ["temperature", "weather", "°c", "°f", "cloud", "wind", "humidity", "rain", "snow"])
        assert not has_sql_query(result["response"])
    
    @pytest.mark.asyncio
    async def test_weather_miami(self):
        """Test weather query for different city."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What's the weather in Miami right now?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert not has_mongo_query(result["response"])
    
    # Search/Information Questions
    @pytest.mark.asyncio
    async def test_search_packing_hawaii(self):
        """Test general search query returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What should I pack for a trip to Hawaii?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert len(result["response"]) > 50, "Response should be detailed"
    
    @pytest.mark.asyncio
    async def test_search_attractions_paris(self):
        """Test search query about tourist attractions."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What are the best tourist attractions in Paris?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert "paris" in result["response"].lower() or "eiffel" in result["response"].lower()
    
    # Booking Policy Questions
    @pytest.mark.asyncio
    async def test_policy_cancellation(self):
        """Test cancellation policy question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What is your cancellation policy?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert not has_sql_query(result["response"]), f"Found SQL in: {result['response']}"
        assert "cancel" in result["response"].lower() or "policy" in result["response"].lower()
    
    @pytest.mark.asyncio
    async def test_policy_refund(self):
        """Test refund question returns natural language (may query bookings)."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "Can I get a refund if I cancel my flight?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"]), f"Not natural language: {result['response'][:200]}"
        assert not has_sql_query(result["response"]), f"Found SQL in response: {result['response']}"
        assert "refund" in result["response"].lower() or "cancel" in result["response"].lower()
    
    @pytest.mark.asyncio
    async def test_policy_change_booking(self):
        """Test booking change question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "How do I change my booking?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"]), f"Not natural language: {result['response'][:200]}"
        assert not has_sql_query(result["response"]), f"Found SQL in response: {result['response']}"
    
    @pytest.mark.asyncio
    async def test_policy_fees(self):
        """Test fee question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "Do you charge cancellation fees?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert "fee" in result["response"].lower() or "charge" in result["response"].lower()
    
    # Payment Questions
    @pytest.mark.asyncio
    async def test_payment_options(self):
        """Test payment options question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What are the payment options?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"]), f"Not natural language: {result['response'][:200]}"
        assert not has_sql_query(result["response"]), f"Found SQL in response: {result['response']}"
        assert not has_mongo_query(result["response"]), f"Found MongoDB query in response: {result['response']}"
    
    @pytest.mark.asyncio
    async def test_payment_credit_cards(self):
        """Test credit card acceptance question."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "Do you accept credit cards?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert "card" in result["response"].lower() or "payment" in result["response"].lower()
    
    # Price & Deals Questions
    @pytest.mark.asyncio
    async def test_deals_best_deals(self):
        """Test best deals question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "How do you find the best deals?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert "deal" in result["response"].lower() or "price" in result["response"].lower()
    
    @pytest.mark.asyncio
    async def test_deals_cheap_flights(self):
        """Test cheap flights question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "When is the cheapest time to book flights?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert not has_sql_query(result["response"])
    
    # Travel Information
    @pytest.mark.asyncio
    async def test_travel_baggage_policy(self):
        """Test baggage policy question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What is the baggage allowance policy?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert "baggage" in result["response"].lower() or "luggage" in result["response"].lower()
    
    @pytest.mark.asyncio
    async def test_travel_airport_arrival(self):
        """Test airport arrival time question."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "How early should I arrive at the airport?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"])
        assert "hour" in result["response"].lower() or "time" in result["response"].lower()
    
    # Account Questions (may query Supabase)
    @pytest.mark.asyncio
    async def test_account_bookings(self):
        """Test my bookings question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "Show me my bookings")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"]), f"Not natural language: {result['response'][:200]}"
        assert not has_sql_query(result["response"]), f"Found SQL in response: {result['response']}"
    
    @pytest.mark.asyncio
    async def test_account_past_trips(self):
        """Test past trips question returns natural language."""
        session_id = await self.create_session()
        result = await send_booking_chat_message(session_id, "What are my past trips?")
        
        assert result["bundles"] is None
        assert is_natural_language(result["response"]), f"Not natural language: {result['response'][:200]}"
        assert not has_sql_query(result["response"]), f"Found SQL in response: {result['response']}"
    
    # Multi-turn Conversation
    @pytest.mark.asyncio
    async def test_conversation_flow(self):
        """Test multi-turn conversation maintains natural language."""
        session_id = await self.create_session()
        
        # Turn 1: General question
        result1 = await send_booking_chat_message(session_id, "What services do you offer?")
        assert is_natural_language(result1["response"])
        
        # Turn 2: Weather question
        result2 = await send_booking_chat_message(session_id, "What's the weather in New York?")
        assert is_natural_language(result2["response"])
        assert not has_sql_query(result2["response"])
        
        # Turn 3: Payment question
        result3 = await send_booking_chat_message(session_id, "What payment methods do you accept?")
        assert is_natural_language(result3["response"])
        assert not has_sql_query(result3["response"])
        assert not has_mongo_query(result3["response"])


class TestBookingChatNoLeakage:
    """Test that technical details never leak into booking_chat responses."""
    
    async def create_session(self):
        """Create a booking_chat session."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/sessions",
                json={
                    "user_id": TEST_USER,
                    "chat_mode": "booking_chat"
                }
            )
            assert response.status_code == 200, f"Failed to create session: {response.text}"
            return response.json()["session_id"]
    
    @pytest.mark.asyncio
    async def test_no_sql_in_any_response(self):
        """Test various questions to ensure no SQL leaks."""
        session_id = await self.create_session()
        
        questions = [
            "Show me my bookings",
            "What are my payments?",
            "Can I get a refund?",
            "How do I change my reservation?",
            "What payment options are available?",
        ]
        
        for question in questions:
            result = await send_booking_chat_message(session_id, question)
            assert not has_sql_query(result["response"]), \
                f"SQL found in response to '{question}': {result['response'][:200]}"
    
    @pytest.mark.asyncio
    async def test_no_mongo_in_any_response(self):
        """Test various questions to ensure no MongoDB queries leak."""
        session_id = await self.create_session()
        
        # Use conversational questions that won't trigger travel search
        questions = [
            "How do I search for flights?",
            "Tell me about hotel booking",
            "What rental car options do you have?",
            "How can I find the best deals?",
        ]
        
        for question in questions:
            result = await send_booking_chat_message(session_id, question, timeout=60.0)
            # These should not trigger actual searches, just provide information
            if result["response"]:  # If there's a response
                assert not has_mongo_query(result["response"]), \
                    f"MongoDB query found in '{question}': {result['response'][:200]}"
    
    @pytest.mark.asyncio
    async def test_no_json_arrays_in_response(self):
        """Test responses don't contain raw JSON arrays."""
        session_id = await self.create_session()
        
        result = await send_booking_chat_message(session_id, "What are the payment options?")
        
        # Should not start with [ or {
        assert not result["response"].strip().startswith('[')
        assert not result["response"].strip().startswith('{')
        
        # Should not contain obvious JSON array markers
        assert '[]' not in result["response"] or result["response"].count('[]') < 2
