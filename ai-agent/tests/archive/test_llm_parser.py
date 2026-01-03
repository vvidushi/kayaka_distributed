#!/usr/bin/env python3
"""
Quick test script for LLM-based intent parser
"""

from dotenv import load_dotenv
load_dotenv()

from intent_parser import IntentParser
import json

def test_parser():
    parser = IntentParser()
    
    test_cases = [
        "I need a flight from LAX to NYC on December 15",
        "Book me a round-trip from San Francisco to Miami, leaving Dec 20 and returning Dec 27",
        "Find hotels in Boston from December 10 to December 15 for 2 people",
        "I want a one-way flight to Atlanta on 12/8/2025",
        "NYC",  # Simple answer
        "SFO",  # Airport code
    ]
    
    print("Testing LLM-based Intent Parser\n" + "="*50)
    
    for i, message in enumerate(test_cases, 1):
        print(f"\nTest {i}: {message}")
        print("-" * 50)
        
        try:
            # For simple answers, provide context
            context = None
            if message in ["NYC", "SFO"]:
                context = {"origin": "LAX", "intent_type": "flight"}
            
            result = parser.parse_travel_request(message, context)
            print(json.dumps(result, indent=2))
            
            # Check for clarification
            clarification = parser.needs_clarification(result)
            if clarification:
                print(f"\n❓ Needs clarification: {clarification}")
            else:
                print("\n✅ All required info collected!")
                
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_parser()
