"""Integration tests for the AI agent system."""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from intent_parser import IntentParser
from mongo_query_generator import MongoQueryGenerator


class TestEndToEndFlightSearch:
    """Test complete flight search workflow."""

    @patch('mongo_query_generator.ChatOpenAI')
    def test_flight_search_workflow(self, mock_openai, freeze_current_date):
        """Test complete workflow from intent parsing to query generation."""
        # Step 1: Parse user intent
        user_query = "Book flight SF to LA from 2025-12-09 to 2025-12-13"
        intent = parse_intent(user_query)
        
        assert intent["intent"] == "flight"
        assert intent["origin"] == "SFO"
        assert intent["destination"] == "LAX"
        
        # Step 2: Generate MongoDB query
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"from": "SFO", "to": "LAX", "departDate": {"$gte": "2025-12-09", "$lte": "2025-12-13"}}'
        mock_openai.return_value = mock_llm
        
        query = generate_mongo_query(intent, "flights")
        
        # Verify query is correct
        assert query["from"] == "SFO"
        assert query["to"] == "LAX"
        assert "returnDate" not in query  # Critical: no returnDate filter


class TestEndToEndHotelSearch:
    """Test complete hotel search workflow."""

    @patch('mongo_query_generator.ChatOpenAI')
    def test_hotel_search_workflow(self, mock_openai, freeze_current_date):
        """Test complete workflow for hotel search."""
        # Step 1: Parse user intent
        user_query = "Find hotels in San Francisco from December 10 to December 15"
        intent = parse_intent(user_query)
        
        assert intent["intent"] == "hotel"
        assert intent["city"] == "San Francisco"
        assert intent["destination"] == "SFO"
        
        # Step 2: Generate MongoDB query
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"city": "San Francisco"}'
        mock_openai.return_value = mock_llm
        
        query = generate_mongo_query(intent, "hotels")
        
        # Verify query uses city field
        assert "city" in query
        assert query["city"] == "San Francisco"


class TestEndToEndCarRentalSearch:
    """Test complete car rental search workflow."""

    @patch('mongo_query_generator.ChatOpenAI')
    def test_car_rental_workflow(self, mock_openai, freeze_current_date):
        """Test complete workflow for car rental search."""
        # Step 1: Parse user intent
        user_query = "Find economy car in LA under 50 dollars per day December 12-14"
        intent = parse_intent(user_query)
        
        assert intent["intent"] == "car"
        assert intent["city"] == "Los Angeles"
        assert intent["carType"] == "Economy"
        assert intent["budget"] == 50
        
        # Step 2: Generate MongoDB query
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"city": "Los Angeles", "type": "Economy", "pricePerDay": {"$lte": 50}}'
        mock_openai.return_value = mock_llm
        
        query = generate_mongo_query(intent, "cars")
        
        # Verify query is correct
        assert query["city"] == "Los Angeles"
        assert query["type"] == "Economy"
        assert query["pricePerDay"]["$lte"] == 50


class TestEdgeCases:
    """Test edge cases and error scenarios."""

    def test_malformed_query(self, freeze_current_date):
        """Test handling of malformed user query."""
        user_query = "asdfghjkl"
        intent = parse_intent(user_query)
        
        # Should return some default or general intent
        assert "intent" in intent
        assert isinstance(intent, dict)

    def test_partial_information_query(self, freeze_current_date):
        """Test query with partial information."""
        user_query = "I want to fly somewhere on December 10"
        intent = parse_intent(user_query)
        
        assert intent["intent"] == "flight"
        assert intent["startDate"] == "2025-12-10"
        # Destination might be missing
        assert intent.get("destination") is None or intent.get("destination") == ""

    @patch('mongo_query_generator.ChatOpenAI')
    def test_all_date_formats_integration(self, mock_openai, freeze_current_date):
        """Test all date format variations work end-to-end."""
        date_queries = [
            ("Book flight SF to LA from 2025-12-09 to 2025-12-13", "ISO"),
            ("Flights SFO to LAX, 8th Dec to 13th Dec", "Ordinal"),
            ("Book flight SFO to LAX 12/9/2025 and returning 12/13/2025", "Numeric"),
            ("Flights from SFO to LAX from December 9 to December 13", "Month names"),
            ("Flights SFO to LAX December 10 through December 14", "Through keyword"),
        ]
        
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"from": "SFO", "to": "LAX", "departDate": {"$gte": "2025-12-09"}}'
        mock_openai.return_value = mock_llm
        
        for query, format_name in date_queries:
            intent = parse_intent(query)
            
            # All should parse as flight intent
            assert intent["intent"] == "flight", f"Failed for {format_name} format"
            assert intent["origin"] == "SFO", f"Failed origin for {format_name}"
            assert intent["destination"] == "LAX", f"Failed destination for {format_name}"
            assert intent.get("startDate"), f"Failed date parsing for {format_name}"
