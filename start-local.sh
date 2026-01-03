#!/bin/bash

# Script to start all services locally using cloud databases

set -e

echo "🚀 Starting Kayak Clone services locally..."
echo "📡 Using cloud databases from .env files"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist
check_env_file() {
  if [ ! -f "$1" ]; then
    echo "❌ Error: $1 not found"
    exit 1
  fi
}

check_env_file "backend/.env"
check_env_file "frontend/.env"
check_env_file "ai-agent/.env"

echo -e "${GREEN}✅ All .env files found${NC}"
echo ""

# Function to check if port is available
check_port() {
  if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
    return 1
  fi
  return 0
}

# Check ports
check_port 3000 || { echo "Please free port 3000"; exit 1; }
check_port 5173 || { echo "Please free port 5173"; exit 1; }
check_port 8000 || { echo "Please free port 8000"; exit 1; }

echo -e "${GREEN}✅ All ports available${NC}"
echo ""

# Trap to kill all background processes on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Stopping all services...${NC}"
  kill $BACKEND_PID $AI_AGENT_PID $FRONTEND_PID 2>/dev/null || true
  exit
}
trap cleanup INT TERM

# Start Backend
echo -e "${BLUE}🔧 Starting Backend (port 3000)...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  npm install
fi
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 3

# Start AI-Agent
echo -e "${BLUE}🤖 Starting AI-Agent (port 8000)...${NC}"
cd ai-agent
if [ ! -d ".venv" ]; then
  echo "📦 Setting up AI-Agent Python environment..."
  if [ -f "./update-requirements.sh" ]; then
    ./update-requirements.sh
  else
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
  fi
fi
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 > ../logs/ai-agent.log 2>&1 &
AI_AGENT_PID=$!
cd ..
sleep 3

# Start Frontend
echo -e "${BLUE}🎨 Starting Frontend (port 5173)...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
fi
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

# Wait a bit for services to start
sleep 5

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo -e "${BLUE}📍 Service URLs:${NC}"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3000"
echo "   AI-Agent:  http://localhost:8000"
echo ""
echo -e "${BLUE}💾 Using Cloud Databases:${NC}"
echo "   MongoDB:   MongoDB Atlas (from backend/.env)"
echo "   PostgreSQL: Supabase (from backend/.env & ai-agent/.env)"
echo "   Redis:     Redis Cloud (from backend/.env & ai-agent/.env)"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo "   Backend:   tail -f logs/backend.log"
echo "   AI-Agent:  tail -f logs/ai-agent.log"
echo "   Frontend:  tail -f logs/frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for all background processes
wait



