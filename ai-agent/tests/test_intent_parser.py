"""Tests for intent_parser.py - Natural language understanding."""
import pytest
from intent_parser import IntentParser


class TestFlightIntentParsing:
    """Test flight intent parsing with various formats."""

    def test_iso_date_format(self, freeze_current_date):
        """Test ISO date format (YYYY-MM-DD)."""
        parser = IntentParser()
        result = parser.parse_travel_request("Book flight SF to LA from 2025-12-09 to 2025-12-13")
        assert result["intent"] == "flight"
        assert result["origin"] == "SFO"
        assert result["destination"] == "LAX"
        assert result["startDate"] == "2025-12-09"
        assert result["endDate"] == "2025-12-13"

    def test_ordinal_date_format(self, freeze_current_date):
        """Test ordinal date format (8th, 12th, etc.)."""
        parser = IntentParser()
        result = parser.parse_travel_request("Flights SFO to LAX, 8th Dec to 13th Dec")
        assert result["intent"] == "flight"
        assert result["origin"] == "SFO"
        assert result["destination"] == "LAX"
        assert result["startDate"] == "2025-12-08"
        assert result["endDate"] == "2025-12-13"

    def test_two_letter_city_codes(self, freeze_current_date):
        """Test 2-letter city codes (SF, LA)."""
        result = parse_intent("Find flights from SF to LA")
        assert result["intent"] == "flight"
        assert result["origin"] == "SFO"
        assert result["destination"] == "LAX"

    def test_three_letter_airport_codes(self, freeze_current_date):
        """Test 3-letter airport codes (SFO, LAX)."""
        result = parse_intent("Book flight from SFO to LAX")
        assert result["intent"] == "flight"
        assert result["origin"] == "SFO"
        assert result["destination"] == "LAX"

    def test_full_city_names(self, freeze_current_date):
        """Test full city names (San Francisco, Los Angeles)."""
        result = parse_intent("Flights from San Francisco to Los Angeles")
        assert result["intent"] == "flight"
        assert result["origin"] == "SFO"
        assert result["destination"] == "LAX"

    def test_international_suffix(self, freeze_current_date):
        """Test 'International' suffix handling."""
        result = parse_intent("Flights from San Francisco International to LAX")
        assert result["intent"] == "flight"
        assert result["origin"] == "SFO"
        assert result["destination"] == "LAX"

    def test_round_trip_flight(self, freeze_current_date):
        """Test round-trip flight parsing."""
        result = parse_intent("Round-trip flight SFO to LAX departing 2025-12-06 returning 2025-12-09")
        assert result["intent"] == "flight"
        assert result["origin"] == "SFO"
        assert result["destination"] == "LAX"
        assert result["startDate"] == "2025-12-06"
        assert result["endDate"] == "2025-12-09"

    def test_through_keyword(self, freeze_current_date):
        """Test 'through' keyword for date ranges."""
        result = parse_intent("Flights SFO to LAX December 10 through December 14")
        assert result["intent"] == "flight"
        assert result["startDate"] == "2025-12-10"
        assert result["endDate"] == "2025-12-14"

    def test_month_names(self, freeze_current_date):
        """Test month names in dates."""
        result = parse_intent("Flights from SFO to LAX from December 9 to December 13")
        assert result["intent"] == "flight"
        assert result["startDate"] == "2025-12-09"
        assert result["endDate"] == "2025-12-13"

    def test_numeric_dates(self, freeze_current_date):
        """Test numeric date format (MM/DD/YYYY)."""
        result = parse_intent("Book flight SFO to LAX 12/9/2025 and returning 12/13/2025")
        assert result["intent"] == "flight"
        assert result["startDate"] == "2025-12-09"
        assert result["endDate"] == "2025-12-13"


class TestHotelIntentParsing:
    """Test hotel intent parsing."""

    def test_hotel_in_sf_with_dates(self, freeze_current_date):
        """Test hotel search in SF with dates."""
        result = parse_intent("Find hotels in SF from December 10 to December 15")
        assert result["intent"] == "hotel"
        assert result["destination"] == "SFO"
        assert result["city"] == "San Francisco"
        assert result["startDate"] == "2025-12-10"
        assert result["endDate"] == "2025-12-15"

    def test_hotel_in_san_francisco(self, freeze_current_date):
        """Test hotel search with full city name."""
        result = parse_intent("Show me hotels in San Francisco")
        assert result["intent"] == "hotel"
        assert result["destination"] == "SFO"
        assert result["city"] == "San Francisco"

    def test_hotel_check_in_check_out(self, freeze_current_date):
        """Test check-in/check-out terminology."""
        result = parse_intent("Hotels in LA check-in 12/10, check-out 12/14")
        assert result["intent"] == "hotel"
        assert result["destination"] == "LAX"
        assert result["city"] == "Los Angeles"
        assert result["startDate"] == "2025-12-10"
        assert result["endDate"] == "2025-12-14"


class TestCarRentalIntentParsing:
    """Test car rental intent parsing."""

    def test_suv_rental_in_sf(self, freeze_current_date):
        """Test SUV rental in SF."""
        result = parse_intent("Show me SUV rentals in San Francisco")
        assert result["intent"] == "car"
        assert result["destination"] == "SFO"
        assert result["city"] == "San Francisco"
        assert result["carType"] == "SUV"

    def test_economy_car_in_la(self, freeze_current_date):
        """Test economy car in LA."""
        result = parse_intent("Find economy car in LA under 50 dollars per day December 12-14")
        assert result["intent"] == "car"
        assert result["destination"] == "LAX"
        assert result["city"] == "Los Angeles"
        assert result["carType"] == "Economy"
        assert result["budget"] == 50
        assert result["startDate"] == "2025-12-12"
        assert result["endDate"] == "2025-12-14"

    def test_car_rental_with_two_letter_code(self, freeze_current_date):
        """Test car rental with 2-letter city code."""
        result = parse_intent("Show me SUV rentals in SF")
        assert result["intent"] == "car"
        assert result["destination"] == "SFO"
        assert result["city"] == "San Francisco"


class TestBudgetParsing:
    """Test budget constraint parsing."""

    def test_under_budget(self, freeze_current_date):
        """Test 'under' budget constraint."""
        result = parse_intent("Flights under $200")
        assert result["budget"] == 200

    def test_below_budget(self, freeze_current_date):
        """Test 'below' budget constraint."""
        result = parse_intent("Hotels below 150 dollars")
        assert result["budget"] == 150

    def test_less_than_budget(self, freeze_current_date):
        """Test 'less than' budget constraint."""
        result = parse_intent("Cars less than $60 per day")
        assert result["budget"] == 60


class TestAmbiguousQueries:
    """Test handling of ambiguous or incomplete queries."""

    def test_missing_destination(self, freeze_current_date):
        """Test query with missing destination."""
        result = parse_intent("Book a flight on December 10")
        assert result["intent"] == "flight"
        assert result["startDate"] == "2025-12-10"
        # Destination should be None or empty
        assert result.get("destination") is None or result.get("destination") == ""

    def test_missing_dates(self, freeze_current_date):
        """Test query with missing dates."""
        result = parse_intent("Find hotels in San Francisco")
        assert result["intent"] == "hotel"
        assert result["destination"] == "SFO"
        # Dates should be None or empty
        assert result.get("startDate") is None or result.get("startDate") == ""

    def test_general_travel_query(self, freeze_current_date):
        """Test general travel query."""
        result = parse_intent("I want to travel to Los Angeles")
        # Should detect some intent, possibly flight or general
        assert result["intent"] in ["flight", "general", "hotel"]
