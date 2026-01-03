"""Pytest configuration and fixtures."""
import pytest
from datetime import datetime
from freezegun import freeze_time
from dotenv import load_dotenv
import os

# Load environment variables for all tests
load_dotenv()


@pytest.fixture
def current_date():
    """Return the current test date."""
    return datetime(2025, 12, 6)


@pytest.fixture
def freeze_current_date(current_date):
    """Freeze time to the current test date."""
    with freeze_time(current_date):
        yield current_date


@pytest.fixture
def sample_flight_data():
    """Sample flight data for testing."""
    return {
        "_id": "FL-US-12345",
        "id": "FL-US-12345",
        "from": "SFO",
        "to": "LAX",
        "departDate": "2025-12-09",
        "returnDate": None,
        "airline": "United Airlines",
        "flightNumber": "UA123",
        "durationMinutes": 90,
        "price": 150.00,
        "currency": "USD",
        "class": "economy",
        "nonstop": True,
        "stops": 0,
        "totalSeats": 180,
        "availableSeats": 50,
        "departureTime": "08:00",
        "arrivalTime": "09:30",
        "isDeal": True,
        "avgPrice": 200.00,
        "savingsPercent": 25,
    }


@pytest.fixture
def sample_hotel_data():
    """Sample hotel data for testing."""
    return {
        "_id": "HT-US-67890",
        "id": "HT-US-67890",
        "city": "San Francisco",
        "state": "CA",
        "country": "United States",
        "name": "Grand Hotel",
        "stars": 4,
        "pricePerNight": 200.00,
        "currency": "USD",
        "amenities": ["WiFi", "Pool", "Gym"],
    }


@pytest.fixture
def sample_car_data():
    """Sample car rental data for testing."""
    return {
        "_id": "CR-US-11111",
        "id": "CR-US-11111",
        "city": "Los Angeles",
        "state": "CA",
        "country": "United States",
        "vendor": "Budget",
        "type": "Economy",
        "seats": 4,
        "pricePerDay": 41.21,
        "currency": "USD",
    }
