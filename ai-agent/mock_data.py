"""
Mock data generator for testing and development
Creates sample deals for flights and hotels
"""

from models import Deal, DealType, DealStatus
from datetime import datetime, timedelta
import random


def generate_mock_deals() -> list[Deal]:
    """Generate mock flight and hotel deals for testing"""
    deals = []
    
    # Mock flight deals
    flight_routes = [
        ("SFO", "NYC"),
        ("SFO", "LAX"),
        ("SFO", "MIA"),
        ("SFO", "SEA"),
        ("LAX", "NYC"),
        ("LAX", "MIA"),
    ]
    
    for origin, dest in flight_routes:
        base_price = random.uniform(200, 600)
        avg_price = base_price * 1.2  # 20% above current price (good deal)
        
        deal = Deal(
            deal_id=f"flight_{origin}_{dest}_{random.randint(1000, 9999)}",
            deal_type=DealType.FLIGHT,
            origin=origin,
            destination=dest,
            price=base_price,
            currency="USD",
            avg_30d_price=avg_price,
            deal_score=random.randint(50, 90),
            availability=random.randint(5, 50),
            is_limited=random.choice([True, False]),
            tags=["Refundable"] if random.choice([True, False]) else [],
            metadata={
                "airline": random.choice(["United", "Delta", "American", "Southwest"]),
                "stops": random.choice([0, 1]),
                "duration_hours": random.uniform(3, 8),
                "refundable": random.choice([True, False])
            },
            status=DealStatus.ACTIVE
        )
        deals.append(deal)
    
    # Mock hotel deals
    destinations = ["NYC", "MIA", "LAX", "SEA", "SFO"]
    neighborhoods = {
        "NYC": ["Manhattan", "Brooklyn", "Queens"],
        "MIA": ["South Beach", "Downtown", "Brickell"],
        "LAX": ["Hollywood", "Santa Monica", "Downtown"],
        "SEA": ["Downtown", "Capitol Hill", "Fremont"],
        "SFO": ["Downtown", "Mission", "Castro"]
    }
    
    for dest in destinations:
        for i in range(3):  # 3 hotels per destination
            base_price = random.uniform(80, 300)
            avg_price = base_price * 1.15  # 15% above (good deal)
            
            tags = []
            if random.choice([True, False]):
                tags.append("Pet-friendly")
            if random.choice([True, False]):
                tags.append("Breakfast")
            if random.choice([True, False]):
                tags.append("Near transit")
            if random.choice([True, False]):
                tags.append("Refundable")
            
            deal = Deal(
                deal_id=f"hotel_{dest}_{random.randint(1000, 9999)}",
                deal_type=DealType.HOTEL,
                destination=dest,
                listing_id=f"listing_{dest}_{random.randint(10000, 99999)}",
                price=base_price,
                currency="USD",
                avg_30d_price=avg_price,
                deal_score=random.randint(40, 85),
                availability=random.randint(2, 20),
                is_limited=random.choice([True, False]),
                tags=tags,
                metadata={
                    "neighborhood": random.choice(neighborhoods.get(dest, ["Downtown"])),
                    "amenities": ["wifi", "parking", "breakfast"] if "Breakfast" in tags else ["wifi"],
                    "pet_friendly": "Pet-friendly" in tags,
                    "breakfast_included": "Breakfast" in tags,
                    "near_transit": "Near transit" in tags,
                    "transit_score": random.randint(5, 10),
                    "cancellation_policy": "Flexible" if "Refundable" in tags else "Standard",
                    "refund_deadline": (datetime.now() + timedelta(days=random.randint(1, 7))).isoformat(),
                    "refundable": "Refundable" in tags,
                    "parking": random.choice(["Free parking", "Paid parking", "No parking"])
                },
                status=DealStatus.ACTIVE
            )
            deals.append(deal)
    
    return deals

