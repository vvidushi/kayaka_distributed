"""
Deal processing and detection logic
"""

from typing import List, Dict, Any
from models import Deal
import statistics


class DealProcessor:
    """Processes and detects deals from normalized data"""
    
    @staticmethod
    def calculate_deal_score(deal: Deal, price_history: List[float]) -> int:
        """
        Calculate deal score (0-100) based on:
        - Price drop percentage (≥15% = good deal)
        - Limited availability (<5 rooms)
        - Promo indicators
        """
        score = 0
        
        # Price drop scoring (max 60 points)
        if deal.avg_30d_price and deal.price:
            price_drop_pct = ((deal.avg_30d_price - deal.price) / deal.avg_30d_price) * 100
            if price_drop_pct >= 25:
                score += 60
            elif price_drop_pct >= 20:
                score += 50
            elif price_drop_pct >= 15:
                score += 40
            elif price_drop_pct >= 10:
                score += 25
            elif price_drop_pct >= 5:
                score += 10
        
        # Limited availability scoring (max 20 points)
        if deal.is_limited:
            score += 20
        elif deal.availability and deal.availability < 10:
            score += 10
        
        # Tag scoring (max 20 points)
        premium_tags = ["Pet-friendly", "Breakfast", "Near transit", "Refundable"]
        tag_count = sum(1 for tag in deal.tags if tag in premium_tags)
        score += min(tag_count * 5, 20)
        
        return min(score, 100)
    
    @staticmethod
    def detect_deals(deals: List[Dict[str, Any]]) -> List[Deal]:
        """
        Detect deals from normalized records
        Rules:
        - Price ≤ 0.85 × avg_30d_price (≥15% drop)
        - Limited availability (<5)
        - Promo end date approaching
        """
        detected_deals = []
        
        for deal_data in deals:
            deal = Deal(**deal_data)
            
            # Calculate average 30-day price if not provided
            if not deal.avg_30d_price and deal_data.get("price_history"):
                prices = deal_data["price_history"][-30:]  # Last 30 days
                if prices:
                    deal.avg_30d_price = statistics.mean(prices)
            
            # Check if it's a deal
            is_deal = False
            
            # Rule 1: Price drop ≥15%
            if deal.avg_30d_price and deal.price:
                price_drop = ((deal.avg_30d_price - deal.price) / deal.avg_30d_price) * 100
                if price_drop >= 15:
                    is_deal = True
            
            # Rule 2: Limited availability
            if deal.availability and deal.availability < 5:
                deal.is_limited = True
                is_deal = True
            
            # Rule 3: Promo indicator
            if deal.deal_metadata.get("promo_end"):
                promo_end = datetime.fromisoformat(deal.deal_metadata["promo_end"])
                days_until_end = (promo_end - datetime.now()).days
                if days_until_end <= 7:
                    is_deal = True
            
            if is_deal:
                # Calculate deal score
                deal.deal_score = DealProcessor.calculate_deal_score(
                    deal, 
                    deal_data.get("price_history", [])
                )
                detected_deals.append(deal)
        
        return detected_deals
    
    @staticmethod
    def tag_deal(deal: Deal, metadata: Dict[str, Any]) -> Deal:
        """
        Tag deals based on metadata
        Tags: Pet-friendly, Near transit, Breakfast, Refundable, etc.
        """
        tags = []
        
        # Hotel tags
        if deal.deal_type == DealType.HOTEL:
            amenities = metadata.get("amenities", [])
            if "pets_allowed" in amenities or metadata.get("pet_friendly"):
                tags.append("Pet-friendly")
            if "breakfast" in amenities or metadata.get("breakfast_included"):
                tags.append("Breakfast")
            if metadata.get("near_transit") or metadata.get("transit_score", 0) > 7:
                tags.append("Near transit")
            if metadata.get("refundable") or metadata.get("cancellation_policy") == "flexible":
                tags.append("Refundable")
        
        # Flight tags
        elif deal.deal_type == DealType.FLIGHT:
            if metadata.get("refundable"):
                tags.append("Refundable")
            if metadata.get("stops", 0) == 0:
                tags.append("Direct")
            if metadata.get("duration_hours", 0) < 6:
                tags.append("Short flight")
        
        # Car rental tags
        elif deal.deal_type == DealType.CAR:
            car_type = metadata.get("car_type")
            if car_type:
                tags.append(car_type.title())
            if metadata.get("fuel") == "electric":
                tags.append("EV")
            if metadata.get("transmission") == "automatic":
                tags.append("Automatic")
            if metadata.get("refundable"):
                tags.append("Refundable")
            if metadata.get("limited_mileage"):
                tags.append("Limited mileage")

        deal.tags = tags
        return deal
