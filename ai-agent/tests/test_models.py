"""Tests for models.py - SQLModel validation."""
import pytest
from pydantic import ValidationError
from datetime import datetime
from models import (
    Deal,
    Bundle,
    Watch,
    ChatSession,
    DealType,
    DealStatus
)


class TestDealModel:
    """Test Deal model validation."""

    def test_valid_flight_deal(self):
        """Test creating a valid flight deal."""
        deal = Deal(
            deal_id="FLT001",
            deal_type=DealType.FLIGHT,
            origin="LAX",
            destination="NYC",
            price=299.99,
            currency="USD",
            deal_score=85
        )
        assert deal.deal_id == "FLT001"
        assert deal.deal_type == DealType.FLIGHT
        assert deal.origin == "LAX"
        assert deal.destination == "NYC"
        assert deal.price == 299.99
        assert deal.status == DealStatus.ACTIVE

    def test_valid_hotel_deal(self):
        """Test creating a valid hotel deal."""
        deal = Deal(
            deal_id="HTL001",
            deal_type=DealType.HOTEL,
            destination="NYC",
            listing_id="listing_123",
            price=150.00,
            deal_score=90
        )
        assert deal.deal_id == "HTL001"
        assert deal.deal_type == DealType.HOTEL
        assert deal.listing_id == "listing_123"

    def test_deal_with_tags(self):
        """Test deal with tags."""
        deal = Deal(
            deal_id="FLT002",
            deal_type=DealType.FLIGHT,
            origin="SFO",
            destination="MIA",
            price=199.99,
            tags=["cheapest", "limited_time"],
            deal_score=75
        )
        assert len(deal.tags) == 2
        assert "cheapest" in deal.tags


class TestBundleModel:
    """Test Bundle model validation."""

    def test_valid_bundle(self):
        """Test creating a valid bundle."""
        bundle = Bundle(
            bundle_id="BUN001",
            user_id="user_456",
            flight_deal_id=1,
            hotel_deal_id=2,
            total_price=500.00,
            fit_score=88.5,
            why_this="Great value with top-rated hotel",
            what_to_watch="Limited availability"
        )
        assert bundle.bundle_id == "BUN001"
        assert bundle.user_id == "user_456"
        assert bundle.total_price == 500.00
        assert bundle.fit_score == 88.5

    def test_bundle_without_hotel(self):
        """Test bundle with flight only."""
        bundle = Bundle(
            bundle_id="BUN002",
            user_id="user_789",
            flight_deal_id=1,
            total_price=299.99,
            fit_score=75.0,
            why_this="Best flight time",
            what_to_watch="Price may increase"
        )
        assert bundle.hotel_deal_id is None
        assert bundle.flight_deal_id == 1


class TestWatchModel:
    """Test Watch model validation."""

    def test_valid_watch(self):
        """Test creating a valid watch."""
        watch = Watch(
            watch_id="WATCH001",
            user_id="user_456",
            bundle_id="BUN001",
            price_threshold=600.0,
            active=True
        )
        assert watch.user_id == "user_456"
        assert watch.watch_id == "WATCH001"
        assert watch.bundle_id == "BUN001"
        assert watch.active is True

    def test_watch_with_deal(self):
        """Test watch for specific deal."""
        watch = Watch(
            watch_id="WATCH002",
            user_id="user_789",
            deal_id="FLT001",
            inventory_threshold=5
        )
        assert watch.deal_id == "FLT001"
        assert watch.bundle_id is None


class TestChatSessionModel:
    """Test ChatSession model validation."""

    def test_valid_chat_session(self):
        """Test creating a valid chat session."""
        session = ChatSession(
            session_id="session_123",
            user_id="user_456",
            context={"origin": "LAX", "destination": "NYC"}
        )
        assert session.session_id == "session_123"
        assert session.user_id == "user_456"
        assert session.context["origin"] == "LAX"

    def test_chat_session_empty_context(self):
        """Test chat session with empty context."""
        session = ChatSession(
            session_id="session_789",
            user_id="user_101"
        )
        assert len(session.context) == 0
