#!/usr/bin/env python3
"""
Test search matching logic without LLM calls
"""

from main import deal_cache
from models import DealType
from mock_data import generate_mock_deals

# Populate cache
if not deal_cache:
    mock_deals = generate_mock_deals()
    for deal in mock_deals:
        deal_cache[deal.deal_id] = deal

flights = [d for d in deal_cache.values() if d.deal_type == DealType.FLIGHT]
hotels = [d for d in deal_cache.values() if d.deal_type == DealType.HOTEL]

print("=" * 70)
print(f"CACHE: {len(flights)} flights, {len(hotels)} hotels")
print("=" * 70)

# Test 1: Flight search LAX → NYC
print("\n✈️  TEST 1: Search flights LAX → NYC")
context = {"origin": "LAX", "destination": "NYC", "intent_type": "flight"}
matching = [f for f in flights 
           if (not context.get("origin") or f.origin == context.get("origin"))
           and (not context.get("destination") or f.destination == context.get("destination"))]

print(f"Found {len(matching)} matches:")
for f in matching[:3]:
    print(f"  ${f.price:.0f} - {f.origin} → {f.destination}")

if matching:
    print("✅ PASS")
else:
    print("❌ FAIL - No matches found")
    print("Available flights:")
    for f in flights[:5]:
        print(f"  {f.origin} → {f.destination}")

# Test 2: Hotel search NYC
print("\n🏨 TEST 2: Search hotels in NYC")
context = {"destination": "NYC", "intent_type": "hotel"}
matching = [h for h in hotels 
           if (not context.get("destination") or h.destination == context.get("destination"))]

print(f"Found {len(matching)} matches:")
for h in matching[:3]:
    print(f"  ${h.price:.0f}/night - {h.destination}")

if matching:
    print("✅ PASS")
else:
    print("❌ FAIL - No matches found")
    print("Available hotels:")
    unique_dests = set(h.destination for h in hotels)
    for dest in list(unique_dests)[:5]:
        print(f"  {dest}")

# Test 3: Flight search SFO → NYC  
print("\n✈️  TEST 3: Search flights SFO → NYC")
context = {"origin": "SFO", "destination": "NYC", "intent_type": "flight"}
matching = [f for f in flights 
           if (not context.get("origin") or f.origin == context.get("origin"))
           and (not context.get("destination") or f.destination == context.get("destination"))]

print(f"Found {len(matching)} matches:")
for f in matching[:3]:
    print(f"  ${f.price:.0f} - {f.origin} → {f.destination}")

if matching:
    print("✅ PASS - This is what the user should see!")
else:
    print("❌ FAIL")
