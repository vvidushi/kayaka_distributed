"""
Natural Language Understanding for user intent parsing using LLM
"""

from typing import Dict, Any, Optional
from datetime import datetime
import re
import os
from openai import OpenAI
import json


class IntentParser:
    """Parses user intent from natural language using OpenAI"""
    
    def __init__(self):
        """Initialize OpenAI client"""
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"  # Fast and cost-effective
    
    def parse_travel_request(self, message: str, session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Parse user travel request from natural language using LLM
        Example: "I've got Oct 25–27, SFO to anywhere warm, total budget $1,000 for two"
        """
        constraints = session_context.copy() if session_context else {}
        # Build context string from session
        context_str = ""
        if session_context:
            context_parts = []
            if session_context.get("intent_type"):
                context_parts.append(f"Looking for: {session_context['intent_type']}")
            if session_context.get("origin"):
                context_parts.append(f"From: {session_context['origin']}")
            if session_context.get("destination"):
                context_parts.append(f"To: {session_context['destination']}")
            if session_context.get("check_in"):
                context_parts.append(f"Departure: {session_context['check_in']}")
            if session_context.get("check_out"):
                context_parts.append(f"Return: {session_context['check_out']}")
            if context_parts:
                context_str = "Previous conversation context:\n" + "\n".join(context_parts) + "\n\n"
        
        # Create the prompt for extraction
        system_prompt = """You are a travel booking assistant that extracts structured information from user messages.

Extract the following information from the user's message:
- intent_type: "flight", "hotel", "car", or "bundle" (infer from context)
- origin: Airport code or city name (for flights/bundles only)
- destination: Airport code or city name (for flights, hotels, cars - the place they're going to or staying in)
- check_in: Departure date or check-in date in ISO format (YYYY-MM-DD)
- check_out: Return date or check-out date in ISO format (YYYY-MM-DD) - optional for one-way trips
- trip_type: "one-way", "round-trip", or "multi-city"
- travelers: Number of people traveling
- budget: Total budget amount in USD (number only)
- amenities: List of amenities/preferences (e.g., ["Pet-friendly", "Breakfast"])
- prefer_direct: Boolean - prefers non-stop flights
- avoid_redeye: Boolean - wants to avoid red-eye flights
- weekend: Boolean - prefers weekend travel

Current date is {current_date}.

For dates:
- If only month/day given, assume current year (or next year if date has passed)
- Accept formats like "Dec 15", "December 15", "12/15", "on December 15"
- For ranges: "Dec 15-20", "from Dec 15 to Dec 20"
- If user says "round-trip" but no return date, note needs_return_date: true

For locations:
- Convert city names to airport codes when obvious (e.g., "San Francisco" -> "SFO")
- Accept both 3-letter codes and full names
- Handle phrases like "from LAX to NYC"

For answers to previous questions:
- If user just answers with a code/city/date, fill in the missing field from context
- Example: If asking for destination and user says "NYC", set destination to "NYC"

Return ONLY valid JSON with extracted fields. Omit fields that aren't mentioned or can't be inferred.""".format(
            current_date=datetime.now().strftime("%B %d, %Y")
        )
        
        user_prompt = context_str + f"User message: {message}\n\nExtract travel information as JSON:"
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=500
            )
            
            extracted = json.loads(response.choices[0].message.content)
            
            # Merge with existing constraints, preferring new values
            for key, value in extracted.items():
                if value is not None and value != "":
                    constraints[key] = value
            
            # Post-processing: normalize dates to ISO format without time
            if constraints.get("check_in") and "T" in str(constraints["check_in"]):
                constraints["check_in"] = constraints["check_in"].split("T")[0]
            if constraints.get("check_out") and "T" in str(constraints["check_out"]):
                constraints["check_out"] = constraints["check_out"].split("T")[0]
            
            return constraints
            
        except Exception as e:
            print(f"LLM parsing failed, falling back to regex: {e}")
            # Fallback to minimal regex parsing
            return self._parse_with_regex(message, constraints)
    
    def _parse_with_regex(self, message: str, constraints: Dict[str, Any]) -> Dict[str, Any]:
        """
        Minimal fallback parsing - just handles simple airport codes
        The LLM should handle everything else
        """
        message_stripped = message.strip()
        
        # Only handle the simplest case: user answers with just an airport code
        if re.match(r"^[A-Z]{3}$", message_stripped):
            if not constraints.get("origin"):
                constraints["origin"] = message_stripped
                return constraints
            elif not constraints.get("destination"):
                constraints["destination"] = message_stripped
                return constraints
        
        # For everything else, return what we have and let clarification handle it
        return constraints
    
    def needs_clarification(self, constraints: Dict[str, Any]) -> Optional[str]:
        """
        Determine if we need to ask a clarifying question
        Maximum of one clarifying question
        """
        # Check if we have travel dates - one-way needs check_in, round-trip needs both
        intent_type = constraints.get("intent_type")
        trip_type = constraints.get("trip_type")
        
        if not constraints.get("check_in"):
            return "What are your travel dates?"
        
        # For round-trip flights and hotels, we need check_out
        if intent_type in ["flight", "hotel"] and trip_type == "round-trip" and not constraints.get("check_out"):
            return "What's your return date?"
        
        if intent_type == "hotel" and not constraints.get("check_out"):
            return "What's your check-out date?"
        
        # Flights need origin
        if intent_type == "flight" and not constraints.get("origin"):
            return "Where are you traveling from?"
        
        # Hotels don't need origin, but need destination
        if intent_type == "hotel" and not constraints.get("destination"):
            return "Where would you like to stay?"
        
        # Flights need destination
        if intent_type == "flight" and not constraints.get("destination"):
            return "Where would you like to go?"
        
        return None  # Have enough information

