#!/bin/bash

# Test fixed quick suggestions with dates included
BASE_URL="http://localhost:8000/api/v1/concierge"

echo "==================================="
echo "Testing Fixed Quick Suggestions"
echo "==================================="

# Create session
SESSION_RESPONSE=$(curl -s -X POST "${BASE_URL}/sessions" \
    -H "Content-Type: application/json" \
    -d '{"user_id":"test_user"}')
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"session_id":"[^"]*' | cut -d'"' -f4)
echo "Created session: $SESSION_ID"
echo ""

if [ -z "$SESSION_ID" ]; then
    echo "Failed to create session. Response:"
    echo "$SESSION_RESPONSE"
    exit 1
fi

# Helper function to test a prompt
test_prompt() {
    local category=$1
    local prompt=$2
    echo "-----------------------------------"
    echo "Category: $category"
    echo "Prompt: \"$prompt\""
    echo "-----------------------------------"
    
    response=$(curl -s -X POST "${BASE_URL}/sessions/${SESSION_ID}/messages" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$prompt\"}")
    
    # Check if response contains results or clarification
    if echo "$response" | grep -q '"bundles"'; then
        count=$(echo "$response" | grep -o '"deal_id"' | wc -l)
        echo "WORKING - Returns $count results"
        # Extract response message
        agent_msg=$(echo "$response" | grep -o '"response":"[^"]*' | head -1 | cut -d'"' -f4)
        if [ ! -z "$agent_msg" ]; then
            echo "   Agent: $agent_msg"
        fi
        # Extract first price if available
        price=$(echo "$response" | grep -o '"price":[0-9.]*' | head -1 | cut -d':' -f2)
        if [ ! -z "$price" ]; then
            echo "   First price: \$$price"
        fi
    elif echo "$response" | grep -q 'need_clarification'; then
        echo "CLARIFICATION - Needs more info"
        clarification=$(echo "$response" | grep -o '"response":"[^"]*' | head -1 | cut -d'"' -f4)
        echo "   Agent asks: $clarification"
    else
        echo "UNEXPECTED - Check response"
        echo "$response" | head -c 200
    fi
    echo ""
}

echo "FLIGHT SUGGESTIONS (All should return results)"
echo "================================================"
test_prompt "Flights" "Find flights from SFO to JFK on December 15"
test_prompt "Flights" "Show me flights from LAX to ATL on December 20"
test_prompt "Flights" "Find flights from BOS to LAX on December 22"
test_prompt "Flights" "Direct flights from PHX to SEA on December 16"

echo ""
echo "HOTEL SUGGESTIONS (All should return results)"
echo "================================================"
test_prompt "Hotels" "Find hotels in New York from Dec 15-17"
test_prompt "Hotels" "Show me hotels in Miami from Dec 20-25"
test_prompt "Hotels" "Budget-friendly hotels in Boston from Dec 15-17"
test_prompt "Hotels" "Pet-friendly hotels in Philadelphia from Dec 20-22"

echo ""
echo "CAR RENTAL SUGGESTIONS (All should return results)"
echo "===================================================="
test_prompt "Cars" "Rent an SUV in New York from Dec 15-20"
test_prompt "Cars" "Economy car in Boston from Dec 22-25"
test_prompt "Cars" "Luxury car rental in Miami from Dec 20-27"
test_prompt "Cars" "Compact car in Philadelphia from Dec 15-18"

echo ""
echo "==================================="
echo "Test Summary"
echo "==================================="
echo "All prompts now include dates and should return results."
echo "If any show CLARIFICATION, the agent needs more info."
echo "If any show UNEXPECTED, check the agent logs."
