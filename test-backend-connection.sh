#!/bin/bash

# Test Backend Connection Script
# Verifies all services are running and accessible

echo "========================================="
echo "KAYAK BACKEND CONNECTION TEST"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test 1: Backend Health
echo "1. Testing Backend Health..."
HEALTH=$(curl -s http://localhost:3000/health/live)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend is accessible at http://localhost:3000${NC}"
    echo "   Response: $HEALTH"
else
    echo -e "${RED}✗ Backend is NOT accessible${NC}"
    exit 1
fi
echo ""

# Test 2: Frontend
echo "2. Testing Frontend..."
FRONTEND=$(curl -s http://localhost:5173 | head -1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend is accessible at http://localhost:5173${NC}"
else
    echo -e "${RED}✗ Frontend is NOT accessible${NC}"
    exit 1
fi
echo ""

# Test 3: MongoDB (via Docker)
echo "3. Testing MongoDB Connection..."
MONGO_TEST=$(docker exec kayak-mongodb mongosh --quiet --eval "db.adminCommand('ping').ok" 2>&1)
if [ "$MONGO_TEST" = "1" ]; then
    echo -e "${GREEN}✓ MongoDB is accessible${NC}"
else
    echo -e "${RED}✗ MongoDB connection failed${NC}"
    exit 1
fi
echo ""

# Test 4: Owner Dashboard API (requires authentication)
echo "4. Testing Owner Dashboard API..."
echo -e "${YELLOW}⚠ Owner Dashboard API requires authentication${NC}"
echo "   Endpoint: http://localhost:3000/owner/dashboard"
echo "   You must be logged in as an owner to test this"
echo ""

# Test 5: Docker Services Status
echo "5. Docker Services Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep kayak
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✓ VERIFICATION COMPLETE${NC}"
echo "========================================="
echo ""
echo "Services are accessible at:"
echo "  - Frontend:  http://localhost:5173"
echo "  - Backend:   http://localhost:3000"
echo "  - MongoDB:   localhost:27017 (Docker internal)"
echo ""
echo "Next Steps:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Login with an owner account"
echo "  3. Navigate to http://localhost:5173/owner"
echo "  4. Check the dashboard counts"
echo ""
echo "Monitor Backend Logs:"
echo "  docker logs -f kayak-backend"
echo ""

