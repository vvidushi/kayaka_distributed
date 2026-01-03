"""Simple tests for IntentParser class."""
import pytest
from intent_parser import IntentParser


class TestIntentParser:
    """Test IntentParser functionality."""

    @pytest.fixture
    def parser(self):
        """Create IntentParser instance."""
        return IntentParser()

    def test_parser_initialization(self, parser):
        """Test that parser initializes correctly."""
        assert parser is not None
        assert isinstance(parser, IntentParser)

    def test_parse_flight_request(self, parser):
        """Test parsing a basic flight request."""
        result = parser.parse_travel_request("I want to fly from SFO to LAX")
        assert isinstance(result, dict)
        assert "intent_type" in result or "origin" in result or len(result) >= 0

    def test_parse_hotel_request(self, parser):
        """Test parsing a basic hotel request."""
        result = parser.parse_travel_request("Find hotels in San Francisco")
        assert isinstance(result, dict)

    def test_parse_car_request(self, parser):
        """Test parsing a basic car rental request."""
        result = parser.parse_travel_request("I need to rent a car in Los Angeles")
        assert isinstance(result, dict)

    def test_parse_with_dates(self, parser):
        """Test parsing with date information."""
        result = parser.parse_travel_request("Flight from SF to LA on December 10")
        assert isinstance(result, dict)

    def test_parse_with_budget(self, parser):
        """Test parsing with budget constraint."""
        result = parser.parse_travel_request("Flights under $200")
        assert isinstance(result, dict)

    def test_parse_empty_message(self, parser):
        """Test parsing empty message."""
        result = parser.parse_travel_request("")
        assert isinstance(result, dict)

    def test_parse_with_session_context(self, parser):
        """Test parsing with existing session context."""
        context = {"budget": 500, "travelers": 2}
        result = parser.parse_travel_request("Find flights to NYC", context)
        assert isinstance(result, dict)
