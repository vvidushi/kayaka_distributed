"""
Bundle building logic with Fit Score calculation
"""

from typing import List, Dict, Any, Optional
from models import Deal, Bundle, DealType
from datetime import datetime
import statistics


class BundleBuilder:
    """Builds flight+hotel bundles from cached deals"""
    
    @staticmethod
    def calculate_fit_score(
        bundle_price: float,
        user_budget: float,
        median_price: float,
        amenity_matches: int,
        total_amenities: int,
        location_score: float = 0.5
    ) -> float:
        """
        Calculate Fit Score (0-100) based on:
        - Price vs budget/median (max 40 points)
        - Amenity/policy match (max 30 points)
        - Location tag (max 30 points)
        """
        score = 0.0
        
        # Price scoring (max 40 points)
        if user_budget > 0:
            price_ratio = bundle_price / user_budget
            if price_ratio <= 0.8:
                score += 40
            elif price_ratio <= 0.9:
                score += 35
            elif price_ratio <= 1.0:
                score += 30
            elif price_ratio <= 1.1:
                score += 20
            else:
                score += 10
        
        # Compare to median
        if median_price > 0:
            median_ratio = bundle_price / median_price
            if median_ratio <= 0.85:
                score += 10  # Bonus for being below median
        
        # Amenity match scoring (max 30 points)
        if total_amenities > 0:
            match_ratio = amenity_matches / total_amenities
            score += match_ratio * 30
        
        # Location scoring (max 30 points)
        score += location_score * 30
        
        return min(score, 100.0)
    
    @staticmethod
    def generate_why_this(
        bundle: Bundle,
        flight_deal: Deal,
        hotel_deal: Deal,
        price_vs_median: float,
        tags: List[str]
    ) -> str:
        """
        Generate "Why this" explanation (≤25 words)
        Based on: price_vs_median, tags, neighborhood
        """
        reasons = []
        
        # Price reason
        if price_vs_median < 0.85:
            discount_pct = int((1 - price_vs_median) * 100)
            reasons.append(f"{discount_pct}% below average")
        
        # Tag reasons
        if "Pet-friendly" in tags:
            reasons.append("pet-friendly")
        if "Breakfast" in tags:
            reasons.append("free breakfast")
        if "Near transit" in tags:
            reasons.append("near transit")
        if "Refundable" in tags:
            reasons.append("flexible cancellation")
        
        # Neighborhood (if available)
        if hotel_deal.deal_metadata.get("neighborhood"):
            reasons.append(f"in {hotel_deal.deal_metadata['neighborhood']}")
        
        # Deal score reason
        if flight_deal.deal_score >= 60 or hotel_deal.deal_score >= 60:
            reasons.append("great deal")
        
        if not reasons:
            reasons.append("good value")
        
        explanation = ", ".join(reasons[:3])  # Limit to 3 reasons
        return explanation.capitalize() + "."
    
    @staticmethod
    def generate_what_to_watch(
        flight_deal: Deal,
        hotel_deal: Deal
    ) -> str:
        """
        Generate "What to watch" alert (≤12 words)
        Based on: refund cutoff, limited rooms, promo end
        """
        alerts = []
        
        # Refund deadline
        if hotel_deal.deal_metadata.get("refund_deadline"):
            deadline = hotel_deal.deal_metadata["refund_deadline"]
            alerts.append(f"Refund by {deadline}")
        
        # Limited availability
        if hotel_deal.is_limited or (hotel_deal.availability and hotel_deal.availability < 5):
            alerts.append(f"Only {hotel_deal.availability} rooms left")
        
        # Promo ending
        if hotel_deal.deal_metadata.get("promo_end"):
            alerts.append("Promo ending soon")
        
        if not alerts:
            alerts.append("Monitor price changes")
        
        return alerts[0] if alerts else "Monitor availability"
    
    @staticmethod
    def build_bundles(
        flights: List[Deal],
        hotels: List[Deal],
        user_constraints: Dict[str, Any],
        max_results: int = 3
    ) -> List[Bundle]:
        """
        Build flight+hotel bundles from cached deals
        
        Args:
            flights: List of flight deals
            hotels: List of hotel deals
            user_constraints: User preferences (budget, dates, amenities, etc.)
            max_results: Maximum number of bundles to return
        """
        bundles = []
        user_budget = user_constraints.get("budget", float('inf'))
        required_amenities = user_constraints.get("amenities", [])
        destination = user_constraints.get("destination")
        
        # Filter deals by destination
        if destination:
            flights = [f for f in flights if f.destination == destination]
            hotels = [h for h in hotels if h.destination == destination]
        
        # Calculate median prices
        flight_prices = [f.price for f in flights]
        hotel_prices = [h.price for h in hotels]
        median_flight = statistics.median(flight_prices) if flight_prices else 0
        median_hotel = statistics.median(hotel_prices) if hotel_prices else 0
        median_total = median_flight + median_hotel
        
        # Build bundles
        for flight in flights[:10]:  # Limit combinations
            for hotel in hotels[:10]:
                total_price = flight.price + hotel.price
                
                # Skip if over budget
                if total_price > user_budget * 1.1:  # Allow 10% over budget
                    continue
                
                # Count amenity matches
                hotel_tags = set(hotel.tags)
                required_set = set(required_amenities)
                amenity_matches = len(hotel_tags.intersection(required_set))
                total_amenities = len(required_set) if required_set else 1
                
                # Calculate location score (simplified)
                location_score = 0.5
                if hotel.deal_metadata.get("transit_score", 0) > 7:
                    location_score = 0.8
                elif hotel.deal_metadata.get("neighborhood"):
                    location_score = 0.6
                
                # Calculate fit score
                fit_score = BundleBuilder.calculate_fit_score(
                    bundle_price=total_price,
                    user_budget=user_budget,
                    median_price=median_total,
                    amenity_matches=amenity_matches,
                    total_amenities=total_amenities,
                    location_score=location_score
                )
                
                # Generate explanations
                price_vs_median = total_price / median_total if median_total > 0 else 1.0
                all_tags = list(set(flight.tags + hotel.tags))
                why_this = BundleBuilder.generate_why_this(
                    bundle=None,  # Will be created below
                    flight_deal=flight,
                    hotel_deal=hotel,
                    price_vs_median=price_vs_median,
                    tags=all_tags
                )
                what_to_watch = BundleBuilder.generate_what_to_watch(flight, hotel)
                
                # Create bundle
                bundle_id = f"bundle_{flight.deal_id}_{hotel.deal_id}_{int(datetime.now().timestamp())}"
                bundle = Bundle(
                    bundle_id=bundle_id,
                    user_id=user_constraints.get("user_id", "anonymous"),
                    flight_deal_id=flight.id,
                    hotel_deal_id=hotel.id,
                    total_price=total_price,
                    fit_score=fit_score,
                    why_this=why_this,
                    what_to_watch=what_to_watch
                )
                
                bundles.append(bundle)
        
        # Sort by fit score and return top results
        bundles.sort(key=lambda b: b.fit_score, reverse=True)
        return bundles[:max_results]
    
    @staticmethod
    def build_car_results(
        cars: List[Deal],
        user_constraints: Dict[str, Any],
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Build car rental results from MongoDB deals
        
        Args:
            cars: List of car rental deals from MongoDB
            user_constraints: User preferences (budget, type, city, etc.)
            max_results: Maximum number of cars to return
        
        Returns:
            List of car deal dictionaries formatted for response
        """
        car_results = []
        user_budget = user_constraints.get("budget", float('inf'))
        preferred_type = user_constraints.get("car_type", "").lower()
        
        # Filter and score cars
        for car in cars:
            # Skip if over budget
            if car.price > user_budget:
                continue
            
            # Calculate score based on preferences
            score = 50.0  # Base score
            
            # Price scoring (better prices = higher score)
            if car.price < user_budget * 0.7:
                score += 30
            elif car.price < user_budget * 0.85:
                score += 20
            elif car.price < user_budget * 1.0:
                score += 10
            
            # Type matching
            car_type = car.deal_metadata.get("type", "").lower()
            if preferred_type and preferred_type in car_type:
                score += 20
            
            # Add tags for features
            tags = car.tags or []
            if "GPS" in tags or "gps" in car.deal_metadata.get("features", []):
                score += 5
            if "4WD" in tags or "4wd" in car.deal_metadata.get("features", []):
                score += 5
            
            car_results.append({
                "deal": car,
                "score": score
            })
        
        # Sort by score
        car_results.sort(key=lambda x: x["score"], reverse=True)
        
        # Return top results
        return car_results[:max_results]
