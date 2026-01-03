#!/bin/bash

# Stop all locally running services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "════════════════════════════════════════════════════"
echo "  Stopping Local Services"
echo "════════════════════════════════════════════════════"
echo ""

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Stop services using PID files
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID 2>/dev/null || true
        print_success "Backend stopped (PID: $BACKEND_PID)"
    fi
    rm logs/backend.pid
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_success "Frontend stopped (PID: $FRONTEND_PID)"
    fi
    rm logs/frontend.pid
fi

if [ -f "logs/ai-agent.pid" ]; then
    AI_AGENT_PID=$(cat logs/ai-agent.pid)
    if ps -p $AI_AGENT_PID > /dev/null 2>&1; then
        kill $AI_AGENT_PID 2>/dev/null || true
        print_success "AI Agent stopped (PID: $AI_AGENT_PID)"
    fi
    rm logs/ai-agent.pid
fi

# Kill any remaining processes on ports
print_info "Checking for remaining processes on ports..."

if lsof -ti:3000 > /dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    print_success "Cleaned up port 3000"
fi

if lsof -ti:5173 > /dev/null 2>&1; then
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    print_success "Cleaned up port 5173"
fi

if lsof -ti:8000 > /dev/null 2>&1; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    print_success "Cleaned up port 8000"
fi

echo ""
print_success "All services stopped"
echo ""
print_info "To start again: ./run-local-cloud.sh"
echo ""

