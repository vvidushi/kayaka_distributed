#!/bin/bash

# Script to push deals to the EKS ALB endpoint
# Usage: ./push_deal.sh --flight | --hotel | --car

ALB_URL="${ALB_URL:-http://k8s-kayakdev-kayaking-98ae61f6c8-1320506053.us-east-1.elb.amazonaws.com}"
# Use localhost:8000 (requires kubectl port-forward -n kayak-dev svc/ai-agent 8000:8000)
API_ENDPOINT="${API_ENDPOINT:-http://localhost:8000/deals/push}"

# Generate unique ID with timestamp
TIMESTAMP=$(date +%s)
RANDOM_ID=$((RANDOM % 1000))

# Parse command line arguments
DEAL_TYPE=""
if [[ "$1" == "--flight" ]]; then
    DEAL_TYPE="flight"
elif [[ "$1" == "--hotel" ]]; then
    DEAL_TYPE="hotel"
elif [[ "$1" == "--car" ]]; then
    DEAL_TYPE="car"
else
    echo "Usage: $0 --flight | --hotel | --car"
    echo ""
    echo "Examples:"
    echo "  $0 --flight    # Push a random flight deal"
    echo "  $0 --hotel     # Push a random hotel deal"
    echo "  $0 --car       # Push a random car deal"
    exit 1
fi

echo "=== Pushing $(echo $DEAL_TYPE | tr '[:lower:]' '[:upper:]') Deal ==="
echo "Endpoint: $API_ENDPOINT"
echo ""

# Flight deal templates
FLIGHT_ORIGINS=("NYC" "LAX" "SFO" "MIA" "ORD" "DEN" "SEA" "BOS")
FLIGHT_DESTINATIONS=("LAX" "NYC" "MIA" "LAS" "HNL" "DFW" "ATL" "PHX")
AIRLINES=("United" "Delta" "American" "JetBlue" "Southwest" "Alaska")

# Hotel cities
HOTEL_CITIES=("New York" "Los Angeles" "Miami" "Las Vegas" "San Francisco" "Chicago" "Seattle" "Boston")
NEIGHBORHOODS=("Downtown" "Airport District" "Beach Area" "Historic District" "Financial District" "Entertainment District")

# Car vendors and types
CAR_VENDORS=("Hertz" "Enterprise" "Avis" "Budget" "National" "Sixt")
CAR_TYPES=("Sedan" "SUV" "Compact" "Luxury" "Convertible" "Minivan")

# Generate deal based on type
if [[ "$DEAL_TYPE" == "flight" ]]; then
    ORIGIN=${FLIGHT_ORIGINS[$((RANDOM % ${#FLIGHT_ORIGINS[@]}))]}
    DEST=${FLIGHT_DESTINATIONS[$((RANDOM % ${#FLIGHT_DESTINATIONS[@]}))]}
    AIRLINE=${AIRLINES[$((RANDOM % ${#AIRLINES[@]}))]}
    PRICE=$((150 + RANDOM % 300))
    AVG_PRICE=$((PRICE + 100 + RANDOM % 200))
    AVAILABILITY=$((5 + RANDOM % 20))
    STOPS=$((RANDOM % 2))
    DURATION=$(awk -v min=2 -v max=6 'BEGIN{srand(); print min+rand()*(max-min)}')
    
    DEAL_JSON=$(cat <<EOF
{
  "deal_id": "flight_${ORIGIN}_${DEST}_${TIMESTAMP}_${RANDOM_ID}",
  "deal_type": "flight",
  "origin": "$ORIGIN",
  "destination": "$DEST",
  "price": $PRICE,
  "currency": "USD",
  "avg_30d_price": $AVG_PRICE,
  "availability": $AVAILABILITY,
  "is_limited": true,
  "tags": "Flash Sale|Limited Seats|Direct|Hot Deal",
  "airline": "$AIRLINE",
  "stops": $STOPS,
  "duration_hours": $DURATION,
  "refundable": true,
  "transit_score": 9,
  "cancellation_policy": "Flex 24h",
  "refund_deadline": "2025-12-25T18:00:00Z",
  "price_history": "$AVG_PRICE|$((AVG_PRICE - 50))|$((PRICE + 50))|$PRICE"
}
EOF
    )
    
    echo "✈️  Pushing Flight Deal:"
    echo "   Route: $ORIGIN → $DEST"
    echo "   Airline: $AIRLINE"
    echo "   Price: \$$PRICE (was \$$AVG_PRICE)"
    echo "   Availability: $AVAILABILITY seats"
    
elif [[ "$DEAL_TYPE" == "hotel" ]]; then
    CITY=${HOTEL_CITIES[$((RANDOM % ${#HOTEL_CITIES[@]}))]}
    NEIGHBORHOOD=${NEIGHBORHOODS[$((RANDOM % ${#NEIGHBORHOODS[@]}))]}
    PRICE=$((80 + RANDOM % 200))
    AVG_PRICE=$((PRICE + 80 + RANDOM % 150))
    AVAILABILITY=$((3 + RANDOM % 15))
    PET_FRIENDLY=$([[ $((RANDOM % 2)) -eq 0 ]] && echo "true" || echo "false")
    BREAKFAST=$([[ $((RANDOM % 2)) -eq 0 ]] && echo "true" || echo "false")
    
    DEAL_JSON=$(cat <<EOF
{
  "deal_id": "hotel_${CITY// /_}_${TIMESTAMP}_${RANDOM_ID}",
  "deal_type": "hotel",
  "destination": "$CITY",
  "city": "$CITY",
  "listing_id": "HT-US-$(echo $CITY | tr '[:lower:]' '[:upper:]' | tr ' ' '-')-${RANDOM_ID}",
  "price": $PRICE,
  "currency": "USD",
  "avg_30d_price": $AVG_PRICE,
  "availability": $AVAILABILITY,
  "is_limited": true,
  "tags": "Weekend Special|Limited Rooms|Hot Deal",
  "neighborhood": "$NEIGHBORHOOD",
  "amenities": "wifi|pool|gym|restaurant",
  "pet_friendly": $PET_FRIENDLY,
  "breakfast_included": $BREAKFAST,
  "near_transit": true,
  "refundable": true,
  "transit_score": 8,
  "cancellation_policy": "Flexible",
  "refund_deadline": "2025-12-23T18:00:00Z",
  "parking": "Valet included",
  "price_history": "$AVG_PRICE|$((AVG_PRICE - 40))|$((PRICE + 30))|$PRICE"
}
EOF
    )
    
    echo "🏨 Pushing Hotel Deal:"
    echo "   Location: $CITY - $NEIGHBORHOOD"
    echo "   Price: \$$PRICE/night (was \$$AVG_PRICE)"
    echo "   Availability: $AVAILABILITY rooms"
    echo "   Pet Friendly: $PET_FRIENDLY | Breakfast: $BREAKFAST"
    
elif [[ "$DEAL_TYPE" == "car" ]]; then
    CITY=${HOTEL_CITIES[$((RANDOM % ${#HOTEL_CITIES[@]}))]}
    VENDOR=${CAR_VENDORS[$((RANDOM % ${#CAR_VENDORS[@]}))]}
    CAR_TYPE=${CAR_TYPES[$((RANDOM % ${#CAR_TYPES[@]}))]}
    PRICE=$((35 + RANDOM % 80))
    AVG_PRICE=$((PRICE + 40 + RANDOM % 60))
    AVAILABILITY=$((4 + RANDOM % 12))
    
    DEAL_JSON=$(cat <<EOF
{
  "deal_id": "car_${CITY// /_}_${TIMESTAMP}_${RANDOM_ID}",
  "deal_type": "car",
  "destination": "$CITY",
  "city": "$CITY",
  "price": $PRICE,
  "currency": "USD",
  "avg_30d_price": $AVG_PRICE,
  "availability": $AVAILABILITY,
  "is_limited": false,
  "tags": "$CAR_TYPE|Automatic|GPS",
  "car_vendor": "$VENDOR",
  "car_type": "$CAR_TYPE",
  "transmission": "automatic",
  "fuel": "gasoline",
  "amenities": "gps|bluetooth|backup_camera",
  "refundable": true,
  "cancellation_policy": "Full refund",
  "refund_deadline": "2025-12-24T18:00:00Z",
  "pickup_location": "$CITY Airport",
  "price_history": "$AVG_PRICE|$((AVG_PRICE - 20))|$((PRICE + 15))|$PRICE"
}
EOF
    )
    
    echo "🚗 Pushing Car Rental Deal:"
    echo "   Location: $CITY"
    echo "   Vendor: $VENDOR"
    echo "   Type: $CAR_TYPE"
    echo "   Price: \$$PRICE/day (was \$$AVG_PRICE)"
    echo "   Availability: $AVAILABILITY cars"
fi

echo ""
echo "📤 Sending request..."
echo ""

# Send the request
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$DEAL_JSON")

# Extract HTTP status code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response (HTTP $HTTP_CODE):"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Check if successful
if [[ "$HTTP_CODE" == "200" ]] && echo "$BODY" | grep -q '"success":true\|"success": true'; then
    echo "✅ Deal pushed successfully!"
    echo ""
    echo "🔌 WebSocket clients will receive:"
    echo "   - Immediate notification with deal details"
    echo "   - Event type: 'message' with role 'assistant'"
    echo "   - Deal alert in the AI chat widget"
    echo ""
    echo "💡 To verify:"
    echo "   1. Open: $ALB_URL"
    echo "   2. Click the AI chat widget (bottom right)"
    echo "   3. You should see the deal notification!"
    echo ""
    echo "📊 To check all deals:"
    echo "   curl '$ALB_URL/api/ai-agent/deals' | jq"
else
    echo "❌ Failed to push deal (HTTP $HTTP_CODE)"
    echo ""
    echo "Debugging tips:"
    echo "  • Check if ai-agent pod is running:"
    echo "    kubectl get pods -n kayak-dev | grep ai-agent"
    echo "  • Check ai-agent logs:"
    echo "    kubectl logs -n kayak-dev -l app=ai-agent --tail=50"
    echo "  • Verify ALB is routing to ai-agent:"
    echo "    curl '$ALB_URL/api/ai-agent/health/live'"
fi
