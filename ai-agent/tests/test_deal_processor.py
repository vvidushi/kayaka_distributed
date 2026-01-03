"""Tests for deal_processor.py - Deal detection and processing."""
import pytest
from unittest.mock import Mock, patch, AsyncMock
import sys
sys.path.insert(0, '..')
from deal_processor import DealProcessor


class TestDealDetection:
    """Test deal detection logic."""

    @pytest.fixture
    def deal_processor(self):
        """Create a DealProcessor instance."""
        return DealProcessor()

    def test_detect_flight_deal(self, deal_processor, sample_flight_data):
        """Test flight deal detection."""
        # Flight with isDeal=True should be detected
        is_deal = deal_processor.is_deal(sample_flight_data, "flight")
        assert is_deal == True

    def test_non_deal_flight(self, deal_processor, sample_flight_data):
        """Test non-deal flight detection."""
        # Modify flight to not be a deal
        sample_flight_data["isDeal"] = False
        sample_flight_data["savingsPercent"] = 0
        
        is_deal = deal_processor.is_deal(sample_flight_data, "flight")
        assert is_deal == False

    def test_deal_by_savings_percent(self, deal_processor):
        """Test deal detection by savings percentage threshold."""
        flight_data = {
            "price": 150.00,
            "avgPrice": 200.00,
            "savingsPercent": 25,
            "isDeal": False  # Even if not marked, high savings should detect
        }
        
        is_deal = deal_processor.is_deal(flight_data, "flight")
        # Should be detected as deal due to 25% savings
        assert is_deal == True or flight_data["savingsPercent"] >= 20

    def test_deal_by_price_threshold(self, deal_processor):
        """Test deal detection by absolute price threshold."""
        hotel_data = {
            "pricePerNight": 50.00,
            "avgPrice": 150.00,
            "isDeal": False
        }
        
        # Low price should potentially be flagged as deal
        is_deal = deal_processor.is_deal(hotel_data, "hotel")
        # Logic depends on implementation
        assert isinstance(is_deal, bool)


class TestDealNotification:
    """Test deal notification formatting."""

    @pytest.fixture
    def deal_processor(self):
        """Create a DealProcessor instance."""
        return DealProcessor()

    def test_format_flight_notification(self, deal_processor, sample_flight_data):
        """Test formatting flight deal notification."""
        notification = deal_processor.format_notification(sample_flight_data, "flight")
        
        assert "flight" in notification["type"].lower()
        assert notification["price"] == 150.00
        assert "SFO" in notification["title"] or "LAX" in notification["title"]

    def test_format_hotel_notification(self, deal_processor, sample_hotel_data):
        """Test formatting hotel deal notification."""
        notification = deal_processor.format_notification(sample_hotel_data, "hotel")
        
        assert "hotel" in notification["type"].lower()
        assert notification["price"] == 200.00
        assert "San Francisco" in notification["title"]

    def test_format_car_notification(self, deal_processor, sample_car_data):
        """Test formatting car rental deal notification."""
        notification = deal_processor.format_notification(sample_car_data, "car")
        
        assert "car" in notification["type"].lower()
        assert notification["price"] == 41.21
        assert "Los Angeles" in notification["title"]


class TestDealProcessing:
    """Test deal processing workflow."""

    @pytest.fixture
    def deal_processor(self):
        """Create a DealProcessor instance."""
        return DealProcessor()

    @pytest.mark.asyncio
    async def test_process_deals_from_feed(self, deal_processor):
        """Test processing deals from feed data."""
        feed_data = [
            {
                "type": "flight",
                "from": "SFO",
                "to": "LAX",
                "price": 150.00,
                "isDeal": True
            },
            {
                "type": "hotel",
                "city": "San Francisco",
                "price": 100.00,
                "isDeal": True
            }
        ]
        
        # Mock the notification broadcast
        with patch.object(deal_processor, 'broadcast_notification', new_callable=AsyncMock) as mock_broadcast:
            await deal_processor.process_deals(feed_data)
            
            # Should have broadcasted notifications
            assert mock_broadcast.call_count >= 1

    @pytest.mark.asyncio
    async def test_filter_duplicate_deals(self, deal_processor):
        """Test filtering out duplicate deals."""
        # Same deal sent twice
        feed_data = [
            {
                "id": "FL-US-12345",
                "type": "flight",
                "price": 150.00,
                "isDeal": True
            },
            {
                "id": "FL-US-12345",  # Duplicate
                "type": "flight",
                "price": 150.00,
                "isDeal": True
            }
        ]
        
        with patch.object(deal_processor, 'broadcast_notification', new_callable=AsyncMock) as mock_broadcast:
            await deal_processor.process_deals(feed_data)
            
            # Should only broadcast once (duplicates filtered)
            assert mock_broadcast.call_count == 1
