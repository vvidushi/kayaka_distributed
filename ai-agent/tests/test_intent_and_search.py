"""
Comprehensive tests for intent parsing and search functionality
"""
import pytest
from intent_parser import IntentParser
from models import DealType
from mock_data import generate_mock_deals


@pytest.fixture
def parser():
    """Create parser instance"""
    return IntentParser()


@pytest.fixture
def mock_deals():
    """Generate mock deals for testing"""
    return generate_mock_deals()


class TestIntentParsing:
    """Test intent parser with various inputs"""
    
    def test_complete_one_way_flight(self, parser):
        """Test: Complete one-way flight request"""
        message = "I need a flight from LAX to NYC on December 15"
        result = parser.parse_travel_request(message)
        
        assert result.get("intent_type") == "flight"
        assert result.get("origin") == "LAX"
        assert result.get("destination") == "NYC"
        assert result.get("check_in") == "2025-12-15"
        assert result.get("trip_type") == "one-way"
        
        clarification = parser.needs_clarification(result)
        assert clarification is None, "Should have all required info"
    
    def test_complete_round_trip_flight(self, parser):
        """Test: Complete round-trip flight request"""
        message = "Book me a round-trip from San Francisco to Miami, leaving Dec 20 and returning Dec 27"
        result = parser.parse_travel_request(message)
        
        assert result.get("intent_type") == "flight"
        assert result.get("origin") == "SFO"
        assert result.get("destination") == "MIA"
        assert result.get("check_in") == "2025-12-20"
        assert result.get("check_out") == "2025-12-27"
        assert result.get("trip_type") == "round-trip"
        
        clarification = parser.needs_clarification(result)
        assert clarification is None, "Should have all required info"
    
    def test_complete_hotel_request(self, parser):
        """Test: Complete hotel request"""
        message = "Find hotels in Boston from December 10 to December 15 for 2 people"
        result = parser.parse_travel_request(message)
        
        assert result.get("intent_type") == "hotel"
        assert result.get("destination") == "Boston"
        assert result.get("check_in") == "2025-12-10"
        assert result.get("check_out") == "2025-12-15"
        assert result.get("travelers") == 2
        
        clarification = parser.needs_clarification(result)
        assert clarification is None, "Hotels should have all required info"
    
    def test_flight_missing_origin(self, parser):
        """Test: One-way flight missing origin"""
        message = "I want a one-way flight to Atlanta on 12/8/2025"
        result = parser.parse_travel_request(message)
        
        assert result.get("intent_type") == "flight"
        assert result.get("destination") == "ATL"
        assert result.get("check_in") == "2025-12-08"
        
        clarification = parser.needs_clarification(result)
        assert clarification is not None, "Should ask for origin"
        assert "from" in clarification.lower() or "origin" in clarification.lower()
    
    def test_followup_destination(self, parser):
        """Test: User answers with just a city (follow-up)"""
        context = {"origin": "LAX", "intent_type": "flight"}
        message = "NYC"
        result = parser.parse_travel_request(message, context)
        
        assert result.get("origin") == "LAX"
        assert result.get("destination") == "NYC"
        assert result.get("intent_type") == "flight"
        
        clarification = parser.needs_clarification(result)
        assert clarification is not None, "Should ask for travel dates"
        assert "date" in clarification.lower()
    
    def test_followup_airport_code(self, parser):
        """Test: User answers with airport code (follow-up)"""
        context = {"origin": "LAX", "intent_type": "flight"}
        message = "SFO"
        result = parser.parse_travel_request(message, context)
        
        assert result.get("origin") == "LAX"
        assert result.get("destination") == "SFO"
        
        clarification = parser.needs_clarification(result)
        assert clarification is not None, "Should ask for travel dates"
    
    def test_round_trip_missing_return_date(self, parser):
        """Test: Round-trip missing return date"""
        message = "Round-trip flight from LAX to NYC leaving December 20"
        result = parser.parse_travel_request(message)
        
        assert result.get("intent_type") == "flight"
        assert result.get("origin") == "LAX"
        assert result.get("destination") == "NYC"
        assert result.get("check_in") == "2025-12-20"
        assert result.get("trip_type") == "round-trip"
        
        clarification = parser.needs_clarification(result)
        assert clarification is not None, "Should ask for return date"
        assert "return" in clarification.lower()


class TestSearchMatching:
    """Test search matching logic"""
    
    def test_flight_search_lax_to_nyc(self, mock_deals):
        """Test: Flight search LAX → NYC"""
        flights = [d for d in mock_deals if d.deal_type == DealType.FLIGHT]
        context = {"origin": "LAX", "destination": "NYC", "intent_type": "flight"}
        
        matching = [f for f in flights 
                   if (not context.get("origin") or f.origin == context.get("origin"))
                   and (not context.get("destination") or f.destination == context.get("destination"))]
        
        assert len(matching) >= 1, f"Should find LAX→NYC flights. Available: {[(f.origin, f.destination) for f in flights]}"
        assert all(f.origin == "LAX" and f.destination == "NYC" for f in matching)
    
    def test_flight_search_sfo_to_nyc(self, mock_deals):
        """Test: Flight search SFO → NYC"""
        flights = [d for d in mock_deals if d.deal_type == DealType.FLIGHT]
        context = {"origin": "SFO", "destination": "NYC", "intent_type": "flight"}
        
        matching = [f for f in flights 
                   if (not context.get("origin") or f.origin == context.get("origin"))
                   and (not context.get("destination") or f.destination == context.get("destination"))]
        
        assert len(matching) >= 1, "Should find SFO→NYC flights"
        assert all(f.origin == "SFO" and f.destination == "NYC" for f in matching)
    
    def test_hotel_search_nyc(self, mock_deals):
        """Test: Hotel search in NYC"""
        hotels = [d for d in mock_deals if d.deal_type == DealType.HOTEL]
        context = {"destination": "NYC", "intent_type": "hotel"}
        
        matching = [h for h in hotels 
                   if (not context.get("destination") or h.destination == context.get("destination"))]
        
        assert len(matching) >= 1, "Should find NYC hotels"
        assert all(h.destination == "NYC" for h in matching)
    
    def test_mock_data_generation(self, mock_deals):
        """Test: Verify mock data has expected structure"""
        flights = [d for d in mock_deals if d.deal_type == DealType.FLIGHT]
        hotels = [d for d in mock_deals if d.deal_type == DealType.HOTEL]
        
        assert len(flights) > 0, "Should have flight deals"
        assert len(hotels) > 0, "Should have hotel deals"
        
        # Check flights have required fields
        for f in flights:
            assert f.origin is not None
            assert f.destination is not None
            assert f.price > 0
            assert f.deal_type == DealType.FLIGHT
        
        # Check hotels have required fields
        for h in hotels:
            assert h.destination is not None
            assert h.price > 0
            assert h.deal_type == DealType.HOTEL


class TestClarificationLogic:
    """Test the clarification logic for various scenarios"""
    
    def test_no_clarification_complete_flight(self, parser):
        """Test: No clarification needed for complete one-way flight"""
        constraints = {
            "intent_type": "flight",
            "origin": "LAX",
            "destination": "NYC",
            "check_in": "2025-12-15",
            "trip_type": "one-way"
        }
        clarification = parser.needs_clarification(constraints)
        assert clarification is None
    
    def test_no_clarification_complete_hotel(self, parser):
        """Test: No clarification needed for complete hotel request"""
        constraints = {
            "intent_type": "hotel",
            "destination": "Boston",
            "check_in": "2025-12-10",
            "check_out": "2025-12-15"
        }
        clarification = parser.needs_clarification(constraints)
        assert clarification is None
    
    def test_clarification_missing_dates(self, parser):
        """Test: Ask for dates when missing"""
        constraints = {
            "intent_type": "flight",
            "origin": "LAX",
            "destination": "NYC"
        }
        clarification = parser.needs_clarification(constraints)
        assert clarification is not None
        assert "date" in clarification.lower()
    
    def test_clarification_missing_destination(self, parser):
        """Test: Ask for destination when missing"""
        constraints = {
            "intent_type": "flight",
            "origin": "LAX",
            "check_in": "2025-12-15"
        }
        clarification = parser.needs_clarification(constraints)
        assert clarification is not None
        assert "where" in clarification.lower() or "destination" in clarification.lower()
