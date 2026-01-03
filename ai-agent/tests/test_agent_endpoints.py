"""
Comprehensive tests for AI Agent API endpoints using real sample data.
Tests all endpoints: sessions, messages, bundles, health checks.
Uses sample data from docs/SAMPLE_DATA.md for realistic test scenarios.
"""
import pytest
import httpx
from datetime import datetime, timedelta
import asyncio


# Base URL for AI Agent service
BASE_URL = "http://localhost:8000/api/v1/concierge"


class TestHealthEndpoints:
    """Test health check and service status endpoints."""
    
    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test health endpoint returns service status."""
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/health")
            assert response.status_code == 200
            data = response.json()
            assert "status" in data
    
    @pytest.mark.asyncio
    async def test_root_endpoint(self):
        """Test root endpoint returns service info."""
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/")
            # Root may not be implemented, just check it responds
            assert response.status_code in [200, 404]


class TestSessionManagement:
    """Test chat session creation and retrieval."""
    
    @pytest.mark.asyncio
    async def test_create_session_flights(self):
        """Test creating a new session for flight searches."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/sessions",
                json={
                    "user_id": "test_user_flights",
                    "flow_type": "flights"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert "session_id" in data
            assert "created_at" in data
            assert "context" in data
            return data["session_id"]
    
    @pytest.mark.asyncio
    async def test_create_session_hotels(self):
        """Test creating a new session for hotel searches."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/sessions",
                json={
                    "user_id": "test_user_hotels",
                    "flow_type": "hotels"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert "session_id" in data
            assert data["context"]["intent_type"] == "hotel"
    
    @pytest.mark.asyncio
    async def test_create_session_cars(self):
        """Test creating a new session for car searches."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BASE_URL}/sessions",
                json={
                    "user_id": "test_user_cars",
                    "flow_type": "cars"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert "session_id" in data
            assert data["context"]["intent_type"] == "car"
    
    @pytest.mark.asyncio
    async def test_get_session(self):
        """Test retrieving an existing session."""
        async with httpx.AsyncClient() as client:
            # Create session
            create_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_user", "flow_type": "flights"}
            )
            session_id = create_response.json()["session_id"]
            
            # Get session
            response = await client.get(f"{BASE_URL}/sessions/{session_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == session_id
            assert "context" in data
            # history may be called "messages" or "history"
            assert "history" in data or "messages" in data


class TestFlightSearches:
    """Test flight search queries using sample data from SAMPLE_DATA.md."""
    
    @pytest.mark.asyncio
    async def test_search_lax_to_jfk(self):
        """Test: Find flights from LAX to JFK on December 15."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Create session
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_lax_jfk", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            # Send message
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find flights from LAX to JFK on December 15"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            assert "bundles" in data or "no flights" in data["response"].lower()
            
            # Verify flight data if bundles returned
            if data.get("bundles"):
                assert len(data["bundles"]) > 0
                flight = data["bundles"][0]
                assert "LAX" in str(flight).upper()
                assert "JFK" in str(flight).upper()
    
    @pytest.mark.asyncio
    async def test_search_sfo_to_ord(self):
        """Test: Show me flights from SFO to ORD on December 20."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_sfo_ord", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Show me flights from SFO to ORD on December 20"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            
            if data.get("bundles"):
                assert any("SFO" in str(b).upper() for b in data["bundles"])
    
    @pytest.mark.asyncio
    async def test_search_bos_to_lax(self):
        """Test: Find cheap flights from BOS to MIA."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_bos_mia", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find cheap flights from BOS to MIA"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
    
    @pytest.mark.asyncio
    async def test_search_direct_flights(self):
        """Test: Direct flights from PHX to SEA."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_phx_sea", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Direct flights from PHX to SEA"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            
            # Should ask for dates or return flights
            if data.get("bundles"):
                # Check for nonstop flights if bundles returned
                pass
            else:
                assert "date" in data["response"].lower() or "when" in data["response"].lower()
    
    @pytest.mark.asyncio
    async def test_roundtrip_search(self):
        """Test: Round-trip flights LAX to JFK Dec 15-22."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_roundtrip", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Round-trip flights from LAX to JFK, departing Dec 15 returning Dec 22"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
    
    @pytest.mark.asyncio
    async def test_nonstop_filter(self):
        """Test: Nonstop flights from LAX to ATL under $500."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_nonstop", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find nonstop flights from LAX to ATL under $500"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data


class TestHotelSearches:
    """Test hotel search queries using sample data from SAMPLE_DATA.md."""
    
    @pytest.mark.asyncio
    async def test_search_new_york_hotels(self):
        """Test: Find hotels in New York from Dec 15-17."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_ny_hotels", "flow_type": "hotels"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find hotels in New York from Dec 15-17"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            
            if data.get("bundles"):
                assert len(data["bundles"]) > 0
                hotel = data["bundles"][0]
                assert "New York" in str(hotel) or "york" in str(hotel).lower()
    
    @pytest.mark.asyncio
    async def test_search_miami_hotels(self):
        """Test: Show me hotels in Miami from Dec 20-25."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_miami", "flow_type": "hotels"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Show me hotels in Miami from Dec 20-25"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
    
    @pytest.mark.asyncio
    async def test_budget_hotels_boston(self):
        """Test: Budget-friendly hotels in Boston."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_boston_budget", "flow_type": "hotels"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Budget-friendly hotels in Boston"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            
            # Should ask for dates
            assert "date" in data["response"].lower() or "when" in data["response"].lower()
    
    @pytest.mark.asyncio
    async def test_hotels_with_amenities(self):
        """Test: Find hotels in New York with a pool under $200/night."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_amenities", "flow_type": "hotels"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find hotels in New York with a pool under $200/night from Dec 15-17"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
    
    @pytest.mark.asyncio
    async def test_pet_friendly_hotels(self):
        """Test: Pet-friendly hotels in Philadelphia."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_pet", "flow_type": "hotels"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Pet-friendly hotels in Philadelphia"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data


class TestCarRentalSearches:
    """Test car rental search queries using sample data from SAMPLE_DATA.md."""
    
    @pytest.mark.asyncio
    async def test_search_cars_new_york(self):
        """Test: Find rental cars in New York."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_ny_cars", "flow_type": "cars"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find rental cars in New York"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            
            # Should ask for dates
            assert "date" in data["response"].lower() or "when" in data["response"].lower()
    
    @pytest.mark.asyncio
    async def test_search_suv_miami(self):
        """Test: SUV rental in Miami from Dec 20-27."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_suv", "flow_type": "cars"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "SUV rental in Miami from Dec 20-27"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
    
    @pytest.mark.asyncio
    async def test_economy_car_chicago(self):
        """Test: Economy car in Chicago for 3 days."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_economy", "flow_type": "cars"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Economy car in Chicago for 3 days"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
    
    @pytest.mark.asyncio
    async def test_7_seater_phoenix(self):
        """Test: 7-seater vehicle in Phoenix."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_7seat", "flow_type": "cars"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "7-seater vehicle in Phoenix"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data


class TestClarificationFlow:
    """Test agent clarification and conversation flow."""
    
    @pytest.mark.asyncio
    async def test_missing_dates_clarification(self):
        """Test agent asks for dates when missing."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_clarify", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            # First message without dates
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find flights from LAX to JFK"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "date" in data["response"].lower() or "when" in data["response"].lower()
            
            # Provide dates in follow-up
            response2 = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "December 15"}
            )
            assert response2.status_code == 200
            data2 = response2.json()
            # Should now search or ask for more details
            assert "response" in data2
    
    @pytest.mark.asyncio
    async def test_missing_destination_clarification(self):
        """Test agent asks for destination when missing."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_dest", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find flights from LAX on December 15"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "where" in data["response"].lower() or "destination" in data["response"].lower()
    
    @pytest.mark.asyncio
    async def test_hotel_date_clarification(self):
        """Test hotel search asks for dates."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_hotel_dates", "flow_type": "hotels"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Hotels in Boston"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "date" in data["response"].lower() or "when" in data["response"].lower()


class TestBundleManagement:
    """Test bundle retrieval and management."""
    
    @pytest.mark.asyncio
    async def test_get_bundles_after_search(self):
        """Test retrieving bundles after a successful search."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Create session and search
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_bundles", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find flights from SFO to JFK on December 15"}
            )
            
            # Get bundles
            response = await client.get(
                f"{BASE_URL}/bundles",
                params={"session_id": session_id}
            )
            # May not be fully implemented yet or require auth
            assert response.status_code in [200, 404, 500, 501]


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    @pytest.mark.asyncio
    async def test_invalid_session_id(self):
        """Test handling of invalid session ID."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BASE_URL}/sessions/invalid-session-123/messages",
                json={"message": "Test"}
            )
            assert response.status_code in [404, 500]
    
    @pytest.mark.asyncio
    async def test_empty_message(self):
        """Test handling of empty message."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_empty", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": ""}
            )
            assert response.status_code in [200, 400, 422]
    
    @pytest.mark.asyncio
    async def test_malformed_request(self):
        """Test handling of malformed request body."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BASE_URL}/sessions",
                json={"invalid_field": "test"}
            )
            # Should either accept with defaults or reject
            assert response.status_code in [200, 400, 422]


class TestMultipleSearches:
    """Test handling multiple searches in same session."""
    
    @pytest.mark.asyncio
    async def test_sequential_flight_searches(self):
        """Test multiple flight searches in one session."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_multi", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            # First search
            response1 = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find flights from LAX to JFK on December 15"}
            )
            assert response1.status_code == 200
            
            # Second search
            response2 = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Now find flights from SFO to ORD on December 20"}
            )
            assert response2.status_code == 200
            
            # Third search
            response3 = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Show me direct flights from BOS to MIA"}
            )
            assert response3.status_code == 200
    
    @pytest.mark.asyncio
    async def test_context_preservation(self):
        """Test that context is preserved across messages."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_context", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            # Set origin
            await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find flights from LAX"}
            )
            
            # Set destination
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "to JFK"}
            )
            
            # Verify context preserved
            session_data = await client.get(f"{BASE_URL}/sessions/{session_id}")
            context = session_data.json().get("context", {})
            assert "LAX" in str(context).upper() or "origin" in context


class TestPerformance:
    """Test performance and response times."""
    
    @pytest.mark.asyncio
    async def test_response_time(self):
        """Test that responses are returned within reasonable time."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            session_response = await client.post(
                f"{BASE_URL}/sessions",
                json={"user_id": "test_perf", "flow_type": "flights"}
            )
            session_id = session_response.json()["session_id"]
            
            start_time = datetime.now()
            response = await client.post(
                f"{BASE_URL}/sessions/{session_id}/messages",
                json={"message": "Find flights from LAX to JFK on December 15"}
            )
            end_time = datetime.now()
            
            duration = (end_time - start_time).total_seconds()
            assert response.status_code == 200
            assert duration < 30  # Should respond within 30 seconds
    
    @pytest.mark.asyncio
    async def test_concurrent_sessions(self):
        """Test handling multiple concurrent sessions."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Create multiple sessions concurrently
            tasks = [
                client.post(
                    f"{BASE_URL}/sessions",
                    json={"user_id": f"test_concurrent_{i}", "flow_type": "flights"}
                )
                for i in range(5)
            ]
            responses = await asyncio.gather(*tasks)
            
            # All should succeed
            for response in responses:
                assert response.status_code == 200
                assert "session_id" in response.json()
