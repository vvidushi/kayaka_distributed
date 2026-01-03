"""
Natural Language Understanding for user intent parsing
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import re


class IntentParser:
    """Parses user intent from natural language"""
    
    @staticmethod
    def parse_travel_request(message: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Parse user travel request from natural language
        Example: "I've got Oct 25–27, SFO to anywhere warm, total budget $1,000 for two"
        """
        message_lower = message.lower()
        constraints = session_context.copy() if session_context else {}
        
        # Handle direct answers to clarifying questions
        # If message is very short (just an airport code, city name, or date), 
        # and we're missing that info, fill it in
        message_stripped = message.strip()
        
        # Check if user is answering with just an airport code (3 letters)
        if re.match(r"^[A-Z]{3}$", message_stripped):
            # If we're missing origin, fill that
            if not constraints.get("origin"):
                constraints["origin"] = message_stripped
                return constraints
            # If we have origin but not destination, fill destination
            elif not constraints.get("destination"):
                constraints["destination"] = message_stripped
                return constraints
        
        # Detect intent type
        if any(word in message_lower for word in ["flight", "fly", "flying"]):
            constraints["intent_type"] = "flight"
        elif any(word in message_lower for word in ["hotel", "stay", "accommodation", "room"]):
            constraints["intent_type"] = "hotel"
        elif any(word in message_lower for word in ["car", "rental", "rent a car"]):
            constraints["intent_type"] = "car"
        elif "bundle" in message_lower or "package" in message_lower:
            constraints["intent_type"] = "bundle"
        
        # Parse dates
        dates = IntentParser._parse_dates(message)
        if dates:
            constraints.update(dates)
        
        # Parse origin
        origin = IntentParser._parse_origin(message)
        if origin:
            constraints["origin"] = origin
        
        # Parse destination
        destination = IntentParser._parse_destination(message)
        if destination:
            constraints["destination"] = destination
            # For hotels and cars, also populate 'city' field
            intent_type = constraints.get("intent_type", "")
            if intent_type in ["hotel", "car"]:
                # Convert airport codes to city names for hotels/cars
                city_names = {
                    "SFO": "San Francisco",
                    "LAX": "Los Angeles",
                    "NYC": "New York",
                    "ORD": "Chicago",
                    "MIA": "Miami",
                    "SEA": "Seattle",
                    "BOS": "Boston",
                    "ATL": "Atlanta",
                    "DEN": "Denver",
                    "LAS": "Las Vegas",
                }
                constraints["city"] = city_names.get(destination, destination)
        
        # Parse budget
        budget = IntentParser._parse_budget(message)
        if budget:
            constraints["budget"] = budget
        
        # Parse number of travelers
        travelers = IntentParser._parse_travelers(message)
        if travelers:
            constraints["travelers"] = travelers
        
        # Parse amenities/constraints
        amenities = IntentParser._parse_amenities(message)
        if amenities:
            constraints["amenities"] = amenities
        
        # Parse preferences
        preferences = IntentParser._parse_preferences(message)
        constraints.update(preferences)
        
        # Parse trip type (one-way vs round-trip)
        trip_type = IntentParser._parse_trip_type(message)
        if trip_type:
            constraints["trip_type"] = trip_type
            # If user says "round-trip" but we don't have a return date, we need to ask
            if trip_type == "round-trip" and not constraints.get("check_out"):
                constraints["needs_return_date"] = True
        
        return constraints
    
    @staticmethod
    def _parse_dates(text: str) -> Optional[Dict[str, Any]]:
        """Parse dates from text"""
        month_patterns = {
            "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
            "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
            "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "september": 9,
            "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12
        }
        
        # Remove ordinals (1st, 2nd, 3rd, 4th-31st) before parsing
        text_lower = re.sub(r'\b(\d{1,2})(?:st|nd|rd|th)\b', r'\1', text.lower())
        
        # Pattern 0: Numeric formats with year "12/8/2025" or "2025-12-08"
        # Format: MM/DD/YYYY or M/D/YYYY
        numeric_range_patterns = [
            # "12/8/2025 and returning 12/13/2025" or "on 12/8/2025 and 12/13/2025"
            r"(\d{1,2})/(\d{1,2})/(\d{4}).*?(?:returning|and|return).*?(\d{1,2})/(\d{1,2})/(\d{4})",
            # "from 12/8/2025 to 12/13/2025"
            r"from\s+(\d{1,2})/(\d{1,2})/(\d{4})\s+to\s+(\d{1,2})/(\d{1,2})/(\d{4})",
            # "12/8/2025 to 12/13/2025"
            r"(\d{1,2})/(\d{1,2})/(\d{4})\s+to\s+(\d{1,2})/(\d{1,2})/(\d{4})",
            # "departing 12/8/2025 returning 12/13/2025"
            r"departing\s+(\d{1,2})/(\d{1,2})/(\d{4}).*?returning\s+(\d{1,2})/(\d{1,2})/(\d{4})",
            # YYYY-MM-DD format (ISO dates)
            r"(\d{4})-(\d{1,2})-(\d{1,2}).*?(?:to|and|return|returning).*?(\d{4})-(\d{1,2})-(\d{1,2})",
            r"from\s+(\d{4})-(\d{1,2})-(\d{1,2})\s+to\s+(\d{4})-(\d{1,2})-(\d{1,2})",
        ]
        
        for pattern in numeric_range_patterns:
            match = re.search(pattern, text)
            if match:
                groups = match.groups()
                if len(groups) == 6:
                    # MM/DD/YYYY format
                    if pattern.startswith(r"(\d{4})"):  # YYYY-MM-DD format
                        year1, month1, day1, year2, month2, day2 = groups
                    else:  # MM/DD/YYYY format
                        month1, day1, year1, month2, day2, year2 = groups
                    
                    try:
                        return {
                            "check_in": datetime(int(year1), int(month1), int(day1)).isoformat(),
                            "check_out": datetime(int(year2), int(month2), int(day2)).isoformat()
                        }
                    except ValueError:
                        continue
        
        # Single date with year - look for two dates
        single_dates = []
        for match in re.finditer(r"(\d{1,2})/(\d{1,2})/(\d{4})", text):
            month, day, year = match.groups()
            try:
                single_dates.append(datetime(int(year), int(month), int(day)))
            except ValueError:
                continue
        
        if len(single_dates) >= 2:
            return {
                "check_in": single_dates[0].isoformat(),
                "check_out": single_dates[1].isoformat()
            }
        
        # Pattern 1: "from December 15 to December 20" or "from Dec 15 to Dec 20"
        for month1, num1 in month_patterns.items():
            for month2, num2 in month_patterns.items():
                # Try with "from...to/through" first
                for connector in ["to", "through"]:
                    pattern = rf"from\s+{month1}\s+(\d{{1,2}})\s+{connector}\s+{month2}\s+(\d{{1,2}})"
                    match = re.search(pattern, text_lower)
                    if match:
                        start_day = int(match.group(1))
                        end_day = int(match.group(2))
                        year = datetime.now().year
                        if num1 < datetime.now().month:
                            year += 1
                        return {
                            "check_in": datetime(year, num1, start_day).isoformat(),
                            "check_out": datetime(year, num2, end_day).isoformat()
                        }
                    
                    # Try without "from"
                    pattern = rf"{month1}\s+(\d{{1,2}})\s+{connector}\s+{month2}\s+(\d{{1,2}})"
                    match = re.search(pattern, text_lower)
                    if match:
                        start_day = int(match.group(1))
                        end_day = int(match.group(2))
                        year = datetime.now().year
                        if num1 < datetime.now().month:
                            year += 1
                        return {
                            "check_in": datetime(year, num1, start_day).isoformat(),
                            "check_out": datetime(year, num2, end_day).isoformat()
                        }
                
                # Try "leaving...returning"
                pattern = rf"(?:leaving|departing)\s+{month1}\s+(\d{{1,2}}).*?returning\s+{month2}\s+(\d{{1,2}})"
                match = re.search(pattern, text_lower)
                if match:
                    start_day = int(match.group(1))
                    end_day = int(match.group(2))
                    year = datetime.now().year
                    if num1 < datetime.now().month:
                        year += 1
                    return {
                        "check_in": datetime(year, num1, start_day).isoformat(),
                        "check_out": datetime(year, num2, end_day).isoformat()
                    }
        
        # Pattern 2: "Oct 25-27" (same month)
        for month_name, month_num in month_patterns.items():
            pattern = rf"{month_name}\s+(\d{{1,2}})[\s–-]+(\d{{1,2}})"
            match = re.search(pattern, text_lower)
            if match:
                start_day = int(match.group(1))
                end_day = int(match.group(2))
                year = datetime.now().year
                if month_num < datetime.now().month:
                    year += 1
                return {
                    "check_in": datetime(year, month_num, start_day).isoformat(),
                    "check_out": datetime(year, month_num, end_day).isoformat()
                }
        
        # Pattern 3: "check-in 12/10, check-out 12/14" (without year)
        checkin_checkout = re.search(r"check-?in\s+(\d{1,2})/(\d{1,2}).*?check-?out\s+(\d{1,2})/(\d{1,2})", text_lower)
        if checkin_checkout:
            month1, day1, month2, day2 = checkin_checkout.groups()
            year = datetime.now().year
            try:
                return {
                    "check_in": datetime(year, int(month1), int(day1)).isoformat(),
                    "check_out": datetime(year, int(month2), int(day2)).isoformat()
                }
            except ValueError:
                pass
        
        # Pattern 4: "departing MM/DD and returning MM/DD" (without year)
        depart_return = re.search(r"departing\s+(\d{1,2})/(\d{1,2}).*?returning\s+(\d{1,2})/(\d{1,2})", text_lower)
        if depart_return:
            month1, day1, month2, day2 = depart_return.groups()
            year = datetime.now().year
            try:
                return {
                    "check_in": datetime(year, int(month1), int(day1)).isoformat(),
                    "check_out": datetime(year, int(month2), int(day2)).isoformat()
                }
            except ValueError:
                pass
        
        # Pattern 5: Single date "on December 15" or "December 15" (for one-way flights or single day)
        for month_name, month_num in month_patterns.items():
            # Try "on December 15" or "on Dec 15"
            pattern = rf"(?:on\s+)?{month_name}\s+(\d{{1,2}})"
            match = re.search(pattern, text_lower)
            if match:
                day = int(match.group(1))
                year = datetime.now().year
                now = datetime.now()
                requested_date = datetime(year, month_num, day)
                
                # If date is more than 7 days in the past, assume next year
                days_diff = (now - requested_date).days
                if days_diff > 7:
                    year += 1
                    requested_date = datetime(year, month_num, day)
                
                return {
                    "check_in": requested_date.isoformat(),
                    # For single date, return None for check_out to indicate one-way/unknown return
                }
        
        # Pattern 6: Single numeric date "on 12/15" or "12/15"
        single_date = re.search(r"(?:on\s+)?(\d{1,2})/(\d{1,2})", text_lower)
        if single_date:
            month, day = single_date.groups()
            year = datetime.now().year
            try:
                month_int = int(month)
                day_int = int(day)
                now = datetime.now()
                requested_date = datetime(year, month_int, day_int)
                
                # If date is more than 7 days in the past, assume next year
                days_diff = (now - requested_date).days
                if days_diff > 7:
                    year += 1
                    requested_date = datetime(year, month_int, day_int)
                
                return {
                    "check_in": requested_date.isoformat(),
                }
            except ValueError:
                pass
        
        return None
    
    @staticmethod
    def _parse_origin(text: str) -> Optional[str]:
        """Parse origin airport/city"""
        # Map common airport/city names to codes
        city_to_code = {
            "san francisco": "SFO",
            "sf": "SFO",
            "los angeles": "LAX",
            "la": "LAX",
            "new york": "NYC",
            "ny": "NYC",
            "nyc": "NYC",
            "chicago": "ORD",
            "miami": "MIA",
            "seattle": "SEA",
            "boston": "BOS",
            "atlanta": "ATL",
            "denver": "DEN",
            "las vegas": "LAS",
            "vegas": "LAS",
        }
        
        text_lower = text.lower()
        
        # First, check for known city names explicitly (longest first to avoid partial matches)
        sorted_cities = sorted(city_to_code.keys(), key=len, reverse=True)
        for city in sorted_cities:
            # Check if city appears after "from"
            if re.search(rf"\bfrom\s+{re.escape(city)}\b", text_lower):
                return city_to_code[city]
        
        # Pattern 1: "from LAX" or "from SF" or "from Los Angeles" or "from San Francisco International"
        from_match = re.search(r"from\s+([A-Z]{2,3}|[A-Za-z\s]+?)(?:\s+International)?\s*(?:to|$|,|\s+on)", text, re.IGNORECASE)
        if from_match:
            origin = from_match.group(1).strip()
            # Remove "International" suffix
            origin = re.sub(r"\s+International$", "", origin, flags=re.IGNORECASE).strip()
            
            # Check if it's a known city name
            origin_lower = origin.lower()
            if origin_lower in city_to_code:
                return city_to_code[origin_lower]
            
            return origin.upper() if len(origin) <= 3 else origin.title()
        
        # Pattern 2: "LAX to" or "SF to" or "San Francisco to" (before "to")
        before_to_match = re.search(r"([A-Z]{2,3}|[A-Za-z\s]+?)\s+to\s+", text, re.IGNORECASE)
        if before_to_match:
            origin = before_to_match.group(1).strip()
            
            # Check if it's a known city name
            origin_lower = origin.lower()
            if origin_lower in city_to_code:
                return city_to_code[origin_lower]
            
            return origin.upper() if len(origin) <= 3 else origin.title()
        
        # Pattern 3: "leaving from SFO" or "leaving from SF" or "departing from San Francisco"
        leaving_match = re.search(r"(?:leaving|departing)\s+from\s+([A-Z]{2,3}|[A-Za-z\s]+?)(?:\s+on|,|$)", text, re.IGNORECASE)
        if leaving_match:
            origin = leaving_match.group(1).strip()
            
            # Check if it's a known city name
            origin_lower = origin.lower()
            if origin_lower in city_to_code:
                return city_to_code[origin_lower]
            
            return origin.upper() if len(origin) == 3 else origin.title()
        
        return None
    
    @staticmethod
    def _parse_destination(text: str) -> Optional[str]:
        """Parse destination"""
        # Map common airport/city names to codes
        city_to_code = {
            "san francisco": "SFO",
            "sf": "SFO",
            "los angeles": "LAX",
            "la": "LAX",
            "new york": "NYC",
            "ny": "NYC",
            "nyc": "NYC",
            "chicago": "ORD",
            "miami": "MIA",
            "seattle": "SEA",
            "boston": "BOS",
            "atlanta": "ATL",
            "denver": "DEN",
            "las vegas": "LAS",
            "vegas": "LAS",
        }
        
        text_lower = text.lower()
        
        # First, check for known city names explicitly (longest first to avoid partial matches)
        sorted_cities = sorted(city_to_code.keys(), key=len, reverse=True)
        for city in sorted_cities:
            # Check if city appears after "to" or "in"
            if re.search(rf"\b(?:to|in)\s+{re.escape(city)}\b", text_lower):
                return city_to_code[city]
        
        # Pattern 1: "to SFO" or "to SF" or "to San Francisco" or "to San Francisco International"
        to_match = re.search(r"to\s+([A-Z]{2,3}|[A-Za-z\s]+?)(?:\s+International)?\s*(?:from|$|,|\s+on|\s+in|\s+for)", text, re.IGNORECASE)
        if to_match:
            dest = to_match.group(1).strip()
            # Remove "International" suffix if captured
            dest = re.sub(r"\s+International$", "", dest, flags=re.IGNORECASE).strip()
            
            # Handle vague destinations like "anywhere warm"
            if any(word in dest.lower() for word in ["warm", "sunny", "beach", "anywhere"]):
                return None
            
            # Check if it's a known city name
            dest_lower = dest.lower()
            if dest_lower in city_to_code:
                return city_to_code[dest_lower]
            
            return dest.upper() if len(dest) <= 3 else dest.title()
        
        # Pattern 2: "in San Francisco" or "in SF" or "in SFO" (for hotels/cars)
        in_match = re.search(r"in\s+([A-Z]{2,3}|[A-Za-z\s]+?)(?:\s+from|\s+for|\s+on|,|$)", text, re.IGNORECASE)
        if in_match:
            dest = in_match.group(1).strip()
            if any(word in dest.lower() for word in ["warm", "sunny", "beach", "anywhere"]):
                return None
            
            # Check if it's a known city name
            dest_lower = dest.lower()
            if dest_lower in city_to_code:
                return city_to_code[dest_lower]
            
            return dest.upper() if len(dest) <= 3 else dest.title()
        
        # Pattern 3: "anywhere warm/sunny"
        if "anywhere" in text.lower():
            return None  # User wants suggestions
        
        # Pattern 4: Standalone city name (when user just says "San Francisco" or "SFO")
        # Only match if it's basically the entire message (with common words filtered out)
        cleaned_text = text.strip()
        # Remove common filler words
        for filler in ["the", "a", "an", "please", "i want", "i need", "i'd like"]:
            cleaned_text = re.sub(rf"\b{filler}\b", "", cleaned_text, flags=re.IGNORECASE).strip()
        
        # Check if it looks like a city name (title case or uppercase) and is short enough
        if cleaned_text:
            # Airport code: 3 uppercase letters
            if re.match(r"^[A-Z]{3}$", cleaned_text):
                return cleaned_text
            # City name: 1-3 capitalized words
            city_match = re.match(r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$", cleaned_text)
            if city_match:
                city_name = city_match.group(1)
                # Check if it's a known city
                if city_name.lower() in city_to_code:
                    return city_to_code[city_name.lower()]
                return city_name
        
        return None
    
    @staticmethod
    def _parse_budget(text: str) -> Optional[float]:
        """Parse budget amount"""
        # Look for "$X" or "budget $X" patterns
        patterns = [
            r"\$(\d{1,3}(?:,\d{3})*)",
            r"budget\s+\$?(\d{1,3}(?:,\d{3})*)",
            r"under\s+\$?(\d{1,3}(?:,\d{3})*)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                amount_str = match.group(1).replace(",", "")
                return float(amount_str)
        
        return None
    
    @staticmethod
    def _parse_travelers(text: str) -> Optional[int]:
        """Parse number of travelers"""
        patterns = [
            r"for\s+(\d+)\s+(?:people|travelers|guests|persons)",
            r"(\d+)\s+(?:people|travelers|guests|persons)",
            r"for\s+(\d+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return int(match.group(1))
        
        return None
    
    @staticmethod
    def _parse_amenities(text: str) -> List[str]:
        """Parse amenities/constraints"""
        amenities = []
        text_lower = text.lower()
        
        amenity_map = {
            "pet": "Pet-friendly",
            "pet-friendly": "Pet-friendly",
            "pets": "Pet-friendly",
            "breakfast": "Breakfast",
            "transit": "Near transit",
            "public transport": "Near transit",
            "metro": "Near transit",
            "refundable": "Refundable",
            "refund": "Refundable",
            "cancellation": "Refundable",
            "cancel": "Refundable",
        }
        
        for keyword, tag in amenity_map.items():
            if keyword in text_lower:
                amenities.append(tag)
        
        return amenities
    
    @staticmethod
    def _parse_preferences(text: str) -> Dict[str, Any]:
        """Parse other preferences"""
        preferences = {}
        text_lower = text.lower()
        
        # Avoid red-eye flights
        if "red-eye" in text_lower or "redeye" in text_lower:
            preferences["avoid_redeye"] = True
        
        # Direct flights preference
        if "direct" in text_lower or "nonstop" in text_lower:
            preferences["prefer_direct"] = True
        
        # Weekend preference
        if "weekend" in text_lower:
            preferences["weekend"] = True
        
        return preferences
    
    @staticmethod
    def _parse_trip_type(text: str) -> Optional[str]:
        """Parse trip type (one-way, round-trip, multi-city)"""
        text_lower = text.lower()
        
        # Check for round-trip keywords
        round_trip_keywords = [
            "round-trip", "round trip", "roundtrip", 
            "return flight", "returning", "come back",
            "both ways", "two way", "two-way"
        ]
        
        for keyword in round_trip_keywords:
            if keyword in text_lower:
                return "round-trip"
        
        # Check for one-way keywords
        one_way_keywords = [
            "one-way", "one way", "oneway",
            "single flight", "just going", "not returning"
        ]
        
        for keyword in one_way_keywords:
            if keyword in text_lower:
                return "one-way"
        
        # Check for multi-city keywords
        multi_city_keywords = ["multi-city", "multiple cities", "several stops"]
        
        for keyword in multi_city_keywords:
            if keyword in text_lower:
                return "multi-city"
        
        return None
    
    @staticmethod
    def needs_clarification(constraints: Dict[str, Any]) -> Optional[str]:
        """
        Determine if we need to ask a clarifying question based on travel type
        Returns most critical missing information first
        Budget is optional for simple searches
        """
        intent_type = constraints.get("intent_type", "")
        
        # For flight bookings - ask dates first, then route
        if "flight" in intent_type or "fly" in intent_type:
            # At minimum, need departure date (check_in)
            if not constraints.get("check_in"):
                return "What is your departure date?"
            if not constraints.get("origin"):
                return "Where are you flying from?"
            if not constraints.get("destination"):
                return "Where would you like to fly to?"
            # If user specified round-trip but no return date, ask for it
            if constraints.get("trip_type") == "round-trip" and not constraints.get("check_out"):
                return "What is your return date?"
            # Return date (check_out) is optional for one-way flights
            # Budget optional for flights
            return None
        
        # For hotel/stay bookings - only need destination and dates
        elif "hotel" in intent_type or "stay" in intent_type:
            if not constraints.get("destination"):
                return "Which city are you looking to stay in?"
            if not constraints.get("check_in") or not constraints.get("check_out"):
                return "What are your check-in and check-out dates?"
            # Budget optional for hotels
            return None
        
        # For car rentals - need pickup location and dates
        elif "car" in intent_type:
            if not constraints.get("check_in") or not constraints.get("check_out"):
                return "What are your rental dates (pickup and return)?"
            if not constraints.get("destination"):
                return "Which city or airport do you need the car?"
            # Budget optional for car rentals
            return None
        
        # For bundles - need everything
        elif "bundle" in intent_type or "package" in intent_type:
            if not constraints.get("destination"):
                return "Where would you like to go?"
            if not constraints.get("check_in") or not constraints.get("check_out"):
                return "What are your travel dates?"
            if not constraints.get("origin"):
                return "Where are you traveling from?"
            if not constraints.get("budget"):
                return "What's your budget for this trip?"
            return None
        
        # For general travel - ask for essentials
        else:
            if not constraints.get("destination"):
                return "Where would you like to go?"
            if not constraints.get("check_in") or not constraints.get("check_out"):
                return "What are your travel dates?"
            return None
