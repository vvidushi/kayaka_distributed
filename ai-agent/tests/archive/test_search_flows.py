#!/usr/bin/env python3
"""
Test flight-only, hotel-only, and bundle search flows
"""

from dotenv import load_dotenv
load_dotenv()

from intent_parser import IntentParser
from main import deal_cache
from models import DealType
from mock_data import generate_mock_deals
import json

parser = IntentParser()

# Populate cache with mock data if empty
if not deal_cache:
    print("Deal cache is empty, generating mock data...")
    mock_deals = generate_mock_deals()
    for deal in mock_deals:
        deal_cache[deal.deal_id] = deal
    print(f"Generated {len(mock_deals)} mock deals\n")

print("=" * 70)
print("MOCK DEAL CACHE STATUS")
print("=" * 70)
flights = [d for d in deal_cache.values() if d.deal_type == DealType.FLIGHT]
hotels = [d for d in deal_cache.values() if d.deal_type == DealType.HOTEL]
print(f"Flights in cache: {len(flights)}")
for f in flights[:3]:
    print(f"  - {f.origin} → {f.destination}: ${f.price}")
print(f"\nHotels in cache: {len(hotels)}")
for h in hotels[:3]:
    print(f"  - {h.destination}: ${h.price}/night")

print("\n" + "=" * 70)
print("TEST 1: Flight-only request")
print("=" * 70)
message = "Find flights from LAX to NYC on December 15"
result = parser.parse_travel_request(message)
print(f"User: {message}")
print(f"Parsed intent: {json.dumps(result, indent=2)}")
clarification = parser.needs_clarification(result)
if clarification:
    print(f"❌ FAIL: Should have all info but asks: {clarification}")
else:
    print(f"✅ PASS: Ready to search for {result.get('intent_type')}")
    print(f"   Origin: {result.get('origin')}")
    print(f"   Destination: {result.get('destination')}")
    print(f"   Date: {result.get('check_in')}")

print("\n" + "=" * 70)
print("TEST 2: Hotel-only request")
print("=" * 70)
message = "Find hotels in Boston from December 10 to December 15"
result = parser.parse_travel_request(message)
print(f"User: {message}")
print(f"Parsed intent: {json.dumps(result, indent=2)}")
clarification = parser.needs_clarification(result)
if clarification:
    print(f"❌ FAIL: Should have all info but asks: {clarification}")
else:
    print(f"✅ PASS: Ready to search for {result.get('intent_type')}")
    print(f"   Destination: {result.get('destination')}")
    print(f"   Check-in: {result.get('check_in')}")
    print(f"   Check-out: {result.get('check_out')}")

print("\n" + "=" * 70)
print("TEST 3: Bundle request (flight + hotel)")
print("=" * 70)
message = "I want to fly from LAX to Boston and stay from Dec 10-15"
result = parser.parse_travel_request(message)
print(f"User: {message}")
print(f"Parsed intent: {json.dumps(result, indent=2)}")
clarification = parser.needs_clarification(result)
if clarification:
    print(f"❌ FAIL: Should have all info but asks: {clarification}")
else:
    intent = result.get('intent_type')
    print(f"✅ PASS: Ready to search")
    print(f"   Intent: {intent}")
    if intent == "bundle":
        print(f"   Should build flight+hotel bundle")
    elif intent == "flight":
        print(f"   ⚠️  WARNING: Detected as flight-only, but message mentions hotel")

print("\n" + "=" * 70)
print("TEST 4: Matching flights from cache")
print("=" * 70)
constraints = {"origin": "LAX", "destination": "NYC", "intent_type": "flight"}
matching = [f for f in flights 
           if f.origin == constraints["origin"] 
           and f.destination == constraints["destination"]]
print(f"Searching for: LAX → NYC")
print(f"Found {len(matching)} matching flights:")
for f in matching[:3]:
    print(f"  ${f.price:.0f} - {f.origin} → {f.destination}")

if not matching:
    print("❌ FAIL: No flights match LAX → NYC")
    print("Available routes:")
    for f in flights[:5]:
        print(f"  {f.origin} → {f.destination}")
else:
    print("✅ PASS: Found matching flights")

print("\n" + "=" * 70)
print("TEST 5: Matching hotels from cache")
print("=" * 70)
constraints = {"destination": "Boston", "intent_type": "hotel"}
matching = [h for h in hotels 
           if h.destination == constraints["destination"]]
print(f"Searching for hotels in: Boston")
print(f"Found {len(matching)} matching hotels:")
for h in matching[:3]:
    print(f"  ${h.price:.0f}/night - {h.destination}")

if not matching:
    print("❌ FAIL: No hotels match Boston")
    print("Available destinations:")
    for h in hotels[:5]:
        print(f"  {h.destination}")
else:
    print("✅ PASS: Found matching hotels")
