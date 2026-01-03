"""
Data models using SQLModel for persistence
"""

from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DealType(str, Enum):
    FLIGHT = "flight"
    HOTEL = "hotel"
    CAR = "car"


class DealStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SOLD_OUT = "sold_out"


class Deal(SQLModel, table=True):
    """Normalized deal record"""
    id: Optional[int] = Field(default=None, primary_key=True)
    deal_id: str = Field(unique=True, index=True)
    deal_type: DealType
    origin: Optional[str] = None  # For flights
    destination: Optional[str] = None  # For flights/hotels
    listing_id: Optional[str] = None  # For hotels
    price: float
    currency: str = Field(default="USD")
    avg_30d_price: Optional[float] = None
    deal_score: int = Field(default=0)  # 0-100
    availability: Optional[int] = None
    is_limited: bool = Field(default=False)  # <5 availability
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    deal_metadata: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    status: DealStatus = DealStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class Bundle(SQLModel, table=True):
    """Flight + Hotel bundle"""
    id: Optional[int] = Field(default=None, primary_key=True)
    bundle_id: str = Field(unique=True, index=True)
    user_id: str = Field(index=True)
    flight_deal_id: Optional[int] = Field(default=None, foreign_key="deal.id")
    hotel_deal_id: Optional[int] = Field(default=None, foreign_key="deal.id")
    total_price: float
    fit_score: float = Field(default=0.0)  # 0-100
    why_this: str = Field(max_length=200)  # ≤25 words explanation
    what_to_watch: str = Field(max_length=100)  # ≤12 words
    created_at: datetime = Field(default_factory=datetime.now)


class Watch(SQLModel, table=True):
    """Price/inventory watch"""
    id: Optional[int] = Field(default=None, primary_key=True)
    watch_id: str = Field(unique=True, index=True)
    user_id: str = Field(index=True)
    bundle_id: Optional[str] = None
    deal_id: Optional[str] = None
    price_threshold: Optional[float] = None
    inventory_threshold: Optional[int] = None
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)


class ChatSession(SQLModel, table=True):
    """Chat session"""
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(unique=True, index=True)
    user_id: str = Field(index=True)
    context: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
