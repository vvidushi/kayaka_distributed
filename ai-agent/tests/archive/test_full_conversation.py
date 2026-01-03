#!/usr/bin/env python3
"""
Test complete conversation flows to validate intent parser
"""

from dotenv import load_dotenv
load_dotenv()

from intent_parser import IntentParser
import json

def print_result(result, clarification):
    print(json.dumps(result, indent=2))
    if clarification:
        print(f"\n❓ Bot asks: {clarification}")
    else:
        print("\n✅ Ready to search!")

parser = IntentParser()

print("=" * 70)
print("SCENARIO 1: Complete one-way flight request")
print("=" * 70)
message = "I need a flight from LAX to NYC on December 15"
result = parser.parse_travel_request(message)
clarification = parser.needs_clarification(result)
print(f"User: {message}")
print_result(result, clarification)
print("\n✅ EXPECTED: Should be ready to search (has origin, destination, date)")

print("\n" + "=" * 70)
print("SCENARIO 2: Complete round-trip flight request")
print("=" * 70)
message = "Book me a round-trip from San Francisco to Miami, leaving Dec 20 and returning Dec 27"
result = parser.parse_travel_request(message)
clarification = parser.needs_clarification(result)
print(f"User: {message}")
print_result(result, clarification)
print("\n✅ EXPECTED: Should be ready to search (has all dates for round-trip)")

print("\n" + "=" * 70)
print("SCENARIO 3: Complete hotel request")
print("=" * 70)
message = "Find hotels in Boston from December 10 to December 15 for 2 people"
result = parser.parse_travel_request(message)
clarification = parser.needs_clarification(result)
print(f"User: {message}")
print_result(result, clarification)
print("\n✅ EXPECTED: Should be ready to search (hotels don't need origin)")

print("\n" + "=" * 70)
print("SCENARIO 4: One-way flight missing origin")
print("=" * 70)
message = "I want a one-way flight to Atlanta on 12/8/2025"
result = parser.parse_travel_request(message)
clarification = parser.needs_clarification(result)
print(f"User: {message}")
print_result(result, clarification)
print("\n✅ EXPECTED: Should ask for origin")

print("\n" + "=" * 70)
print("SCENARIO 5: User answers with just a city (follow-up)")
print("=" * 70)
print("Context: User previously said they want a flight from LAX")
context = {"origin": "LAX", "intent_type": "flight"}
message = "NYC"
result = parser.parse_travel_request(message, context)
clarification = parser.needs_clarification(result)
print(f"User: {message}")
print_result(result, clarification)
print("\n✅ EXPECTED: Should ask for travel date (has origin+destination, missing date)")

print("\n" + "=" * 70)
print("SCENARIO 6: User answers with airport code (follow-up)")
print("=" * 70)
print("Context: User previously said they want a flight from LAX")
context = {"origin": "LAX", "intent_type": "flight"}
message = "SFO"
result = parser.parse_travel_request(message, context)
clarification = parser.needs_clarification(result)
print(f"User: {message}")
print_result(result, clarification)
print("\n✅ EXPECTED: Should ask for travel date (has origin+destination, missing date)")

print("\n" + "=" * 70)
print("SCENARIO 7: Minimal flight request (testing clarification flow)")
print("=" * 70)
message = "I want to fly to Miami"
result = parser.parse_travel_request(message)
clarification = parser.needs_clarification(result)
print(f"User: {message}")
print_result(result, clarification)
print("\n✅ EXPECTED: Should ask for missing critical info (origin or date)")

print("\n" + "=" * 70)
print("SCENARIO 8: Round-trip missing return date")
print("=" * 70)
message = "Round-trip flight from LAX to NYC leaving December 20"
result = parser.parse_travel_request(message)
clarification = parser.needs_clarification(result)
print(f"User: {message}")
print_result(result, clarification)
print("\n✅ EXPECTED: Should ask for return date")
