"""Tests for models.py - SQLModel validation."""
import pytest
from pydantic import ValidationError
from models import (
    Deal,
    Bundle,
    Watch,
    ChatSession,
    DealType,
    DealStatus
)


class TestMessageModel:
    """Test Message model validation."""

    def test_valid_message(self):
        """Test creating a valid message."""
        msg = Message(
            session_id="session_123",
            message="Find flights to LA",
            user_id="user_456"
        )
        assert msg.session_id == "session_123"
        assert msg.message == "Find flights to LA"
        assert msg.user_id == "user_456"

    def test_message_without_user_id(self):
        """Test message without optional user_id."""
        msg = Message(
            session_id="session_123",
            message="Find flights to LA"
        )
        assert msg.session_id == "session_123"
        assert msg.message == "Find flights to LA"

    def test_empty_message_fails(self):
        """Test that empty message content fails validation."""
        with pytest.raises(ValidationError):
            Message(
                session_id="session_123",
                message=""
            )


class TestChatSessionModel:
    """Test ChatSession model validation."""

    def test_valid_chat_session(self):
        """Test creating a valid chat session."""
        session = ChatSession(
            session_id="session_123",
            user_id="user_456",
            messages=[]
        )
        assert session.session_id == "session_123"
        assert session.user_id == "user_456"
        assert len(session.messages) == 0

    def test_chat_session_with_messages(self):
        """Test chat session with message history."""
        session = ChatSession(
            session_id="session_123",
            user_id="user_456",
            messages=[
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"}
            ]
        )
        assert len(session.messages) == 2
        assert session.messages[0]["role"] == "user"


class TestDealNotificationModel:
    """Test DealNotification model validation."""

    def test_valid_deal_notification(self):
        """Test creating a valid deal notification."""
        deal = DealNotification(
            type="flight",
            title="Great Deal: SF to LA",
            description="Save 25% on flights",
            price=150.00,
            originalPrice=200.00,
            savingsPercent=25,
            url="https://example.com/deal"
        )
        assert deal.type == "flight"
        assert deal.price == 150.00
        assert deal.savingsPercent == 25

    def test_deal_without_optional_fields(self):
        """Test deal notification with minimal fields."""
        deal = DealNotification(
            type="hotel",
            title="Hotel Deal",
            price=100.00
        )
        assert deal.type == "hotel"
        assert deal.price == 100.00
        assert deal.originalPrice is None


class TestHealthStatusModel:
    """Test HealthStatus model validation."""

    def test_valid_health_status(self):
        """Test creating a valid health status."""
        health = HealthStatus(
            status="healthy",
            uptime=3600.0,
            version="2.0.0"
        )
        assert health.status == "healthy"
        assert health.uptime == 3600.0
        assert health.version == "2.0.0"


class TestSystemMetricsModel:
    """Test SystemMetrics model validation."""

    def test_valid_system_metrics(self):
        """Test creating valid system metrics."""
        metrics = SystemMetrics(
            cpu_percent=45.5,
            memory_percent=60.0,
            disk_usage_percent=70.0
        )
        assert metrics.cpu_percent == 45.5
        assert metrics.memory_percent == 60.0
        assert metrics.disk_usage_percent == 70.0

    def test_metrics_out_of_range(self):
        """Test that metrics out of range fail validation."""
        with pytest.raises(ValidationError):
            SystemMetrics(
                cpu_percent=150.0,  # Invalid: > 100
                memory_percent=60.0,
                disk_usage_percent=70.0
            )

    def test_negative_metrics_fail(self):
        """Test that negative metrics fail validation."""
        with pytest.raises(ValidationError):
            SystemMetrics(
                cpu_percent=-10.0,  # Invalid: negative
                memory_percent=60.0,
                disk_usage_percent=70.0
            )
