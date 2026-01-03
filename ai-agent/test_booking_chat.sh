#!/bin/bash

# Test booking_chat mode with natural language questions
BASE_URL="http://localhost:8000/api/v1/concierge"

echo "==========================================="
echo "Testing Booking Chat Agent (Natural Language)"
echo "==========================================="

# Create session with booking_chat mode
SESSION_RESPONSE=$(curl -s -X POST "${BASE_URL}/sessions" \
    -H "Content-Type: application/json" \
    -d '{"user_id":"test_user","chat_mode":"booking_chat"}')
SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"session_id":"[^"]*' | cut -d'"' -f4)
echo "Created booking_chat session: $SESSION_ID"
echo ""

if [ -z "$SESSION_ID" ]; then
    echo "Failed to create session"
    exit 1
fi

# Test function
test_chat() {
    local question=$1
    echo "-----------------------------------"
    echo "Q: $question"
    echo "-----------------------------------"
    
    response=$(curl -s -X POST "${BASE_URL}/sessions/${SESSION_ID}/messages" \
        -H "Content-Type: application/json" \
        -d "{\"message\":\"$question\"}")
    
    # Check for natural language response (bundles should be null)
    has_bundles=$(echo "$response" | grep -o '"bundles":\[' | wc -l || echo "0")
    agent_response=$(echo "$response" | grep -o '"response":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ "$has_bundles" -eq 0 ]; then
        echo "PASS: Natural language response"
        echo "A: $agent_response"
        echo ""
    else
        echo "FAIL: Returned bundles (should be conversational only)"
        echo "$response" | head -c 200
    fi
    echo ""
}

echo ""
echo "===== GENERAL QUESTIONS ====="
echo ""

test_chat "What services do you offer?"
test_chat "How can you help me?"
test_chat "Tell me about your company"
test_chat "What is Kayak?"

echo ""
echo "===== BOOKING POLICY QUESTIONS ====="
echo ""

test_chat "What is your cancellation policy?"
test_chat "Can I get a refund if I cancel my flight?"
test_chat "How do I change my booking?"
test_chat "What if I miss my flight?"
test_chat "Do you charge cancellation fees?"
test_chat "Can I modify my hotel reservation?"
test_chat "What are the payment options?"
test_chat "Do you accept credit cards?"

echo ""
echo "===== PRICE & DEALS QUESTIONS ====="
echo ""

test_chat "How do you find the best deals?"
test_chat "Why are flight prices different?"
test_chat "When is the best time to book?"
test_chat "Do you price match?"
test_chat "Are there any hidden fees?"
test_chat "How can I save money on travel?"

echo ""
echo "===== TRAVEL INFORMATION ====="
echo ""

test_chat "What should I pack for Miami in December?"
test_chat "Do I need a passport to travel to Hawaii?"
test_chat "What are the baggage restrictions for flights?"
test_chat "How early should I arrive at the airport?"
test_chat "What is the weather like in Boston in December?"

echo ""
echo "===== ACCOUNT & TECHNICAL ====="
echo ""

test_chat "How do I create an account?"
test_chat "I forgot my password, what should I do?"
test_chat "Can I save my favorite destinations?"
test_chat "How do I contact customer support?"
test_chat "Is my payment information secure?"

echo ""
echo "==========================================="
echo "Test Complete - All responses should be natural language"
echo "==========================================="
