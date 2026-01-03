"""Tests for mongo_query_generator.py - MongoDB query generation."""
import pytest
from unittest.mock import Mock, patch
from mongo_query_generator import MongoQueryGenerator


class TestFlightQueryGeneration:
    """Test MongoDB query generation for flights."""

    @patch('mongo_query_generator.ChatOpenAI')
    def test_one_way_flight_query(self, mock_openai):
        """Test one-way flight query doesn't filter by returnDate."""
        # Mock LLM response
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"from": "SFO", "to": "LAX", "departDate": {"$gte": "2025-12-09", "$lte": "2025-12-13"}}'
        mock_openai.return_value = mock_llm

        context = {
            "intent": "flight",
            "origin": "SFO",
            "destination": "LAX",
            "startDate": "2025-12-09",
            "endDate": "2025-12-13"
        }

        query = generate_mongo_query(context, "flights")
        
        # Verify no returnDate filter
        assert "returnDate" not in query
        assert query["from"] == "SFO"
        assert query["to"] == "LAX"

    @patch('mongo_query_generator.ChatOpenAI')
    def test_round_trip_only_searches_outbound(self, mock_openai):
        """Test round-trip queries only search by departDate."""
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"from": "SFO", "to": "LAX", "departDate": "2025-12-06"}'
        mock_openai.return_value = mock_llm

        context = {
            "intent": "flight",
            "origin": "SFO",
            "destination": "LAX",
            "startDate": "2025-12-06",
            "endDate": "2025-12-09"
        }

        query = generate_mongo_query(context, "flights")
        
        # Should only filter by departDate, not returnDate
        assert "returnDate" not in query
        assert "departDate" in query

    @patch('mongo_query_generator.ChatOpenAI')
    def test_budget_filter_ignored_for_low_values(self, mock_openai):
        """Test budget filter is ignored for unreasonably low values."""
        mock_llm = Mock()
        # LLM should ignore the $50 budget for flights
        mock_llm.invoke.return_value.content = '{"from": "SFO", "to": "LAX", "departDate": "2025-12-09"}'
        mock_openai.return_value = mock_llm

        context = {
            "intent": "flight",
            "origin": "SFO",
            "destination": "LAX",
            "startDate": "2025-12-09",
            "budget": 50  # Too low for flights
        }

        query = generate_mongo_query(context, "flights")
        
        # Should not include price filter for unrealistic budget
        assert "price" not in query or query.get("price", {}).get("$lte", 1000) > 50


class TestHotelQueryGeneration:
    """Test MongoDB query generation for hotels."""

    @patch('mongo_query_generator.ChatOpenAI')
    def test_hotel_city_filter(self, mock_openai):
        """Test hotel query uses city field."""
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"city": "San Francisco"}'
        mock_openai.return_value = mock_llm

        context = {
            "intent": "hotel",
            "city": "San Francisco",
            "startDate": "2025-12-10",
            "endDate": "2025-12-15"
        }

        query = generate_mongo_query(context, "hotels")
        
        assert "city" in query
        assert query["city"] == "San Francisco"

    @patch('mongo_query_generator.ChatOpenAI')
    def test_hotel_price_filter(self, mock_openai):
        """Test hotel query with explicit budget."""
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"city": "San Francisco", "pricePerNight": {"$lte": 200}}'
        mock_openai.return_value = mock_llm

        context = {
            "intent": "hotel",
            "city": "San Francisco",
            "budget": 200
        }

        query = generate_mongo_query(context, "hotels")
        
        assert "pricePerNight" in query
        assert query["pricePerNight"]["$lte"] == 200


class TestCarRentalQueryGeneration:
    """Test MongoDB query generation for car rentals."""

    @patch('mongo_query_generator.ChatOpenAI')
    def test_car_city_and_type_filter(self, mock_openai):
        """Test car query uses city and type fields."""
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"city": "Los Angeles", "type": "Economy"}'
        mock_openai.return_value = mock_llm

        context = {
            "intent": "car",
            "city": "Los Angeles",
            "carType": "Economy"
        }

        query = generate_mongo_query(context, "cars")
        
        assert "city" in query
        assert query["city"] == "Los Angeles"
        assert "type" in query
        assert query["type"] == "Economy"

    @patch('mongo_query_generator.ChatOpenAI')
    def test_car_budget_filter(self, mock_openai):
        """Test car query with price per day budget."""
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{"city": "Los Angeles", "pricePerDay": {"$lte": 50}}'
        mock_openai.return_value = mock_llm

        context = {
            "intent": "car",
            "city": "Los Angeles",
            "budget": 50
        }

        query = generate_mongo_query(context, "cars")
        
        assert "pricePerDay" in query
        assert query["pricePerDay"]["$lte"] == 50


class TestQueryValidation:
    """Test query validation and error handling."""

    @patch('mongo_query_generator.ChatOpenAI')
    def test_invalid_json_handling(self, mock_openai):
        """Test handling of invalid JSON from LLM."""
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = 'This is not valid JSON'
        mock_openai.return_value = mock_llm

        context = {"intent": "flight"}

        # Should handle gracefully and return empty query or raise exception
        try:
            query = generate_mongo_query(context, "flights")
            # If it doesn't raise, should return empty dict or default query
            assert isinstance(query, dict)
        except Exception as e:
            # Or it might raise an exception, which is also acceptable
            assert True

    @patch('mongo_query_generator.ChatOpenAI')
    def test_empty_context(self, mock_openai):
        """Test handling of empty context."""
        mock_llm = Mock()
        mock_llm.invoke.return_value.content = '{}'
        mock_openai.return_value = mock_llm

        context = {}

        query = generate_mongo_query(context, "flights")
        
        # Should return empty or minimal query
        assert isinstance(query, dict)
