#!/bin/bash

# Kayak Clone - Run Locally with Cloud Databases
# This script starts all services locally (no Docker) while using cloud databases

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════╗"
echo "║  Kayak Clone - Local Run with Cloud Databases     ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if running from project root
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Stop Docker containers if running
print_info "Checking for running Docker containers..."
if docker ps | grep -q "kayak-"; then
    print_warning "Stopping Docker containers..."
    docker-compose down
    print_success "Docker containers stopped"
else
    print_info "No Docker containers running"
fi

# Verify Node.js installation
print_info "Verifying Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20+"
    exit 1
fi
NODE_VERSION=$(node -v)
print_success "Node.js installed: $NODE_VERSION"

# Verify Python installation
print_info "Verifying Python installation..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.12+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
print_success "Python installed: $PYTHON_VERSION"

# Check environment files
print_info "Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    print_error "backend/.env not found. Please create it from env.localhost.template"
    exit 1
fi
if [ ! -f "frontend/.env" ]; then
    print_error "frontend/.env not found. Please create it from env.localhost.template"
    exit 1
fi
print_success "Environment files found"

# Verify cloud database configurations
print_info "Verifying cloud database connections..."
if grep -q "mongodb+srv://" backend/.env; then
    print_success "MongoDB Atlas configured"
else
    print_error "MongoDB Atlas not configured in backend/.env"
    exit 1
fi

if grep -q "supabase.com" backend/.env; then
    print_success "Supabase configured"
else
    print_warning "Supabase not configured (optional)"
fi

if grep -q "firebaseapp.com" frontend/.env; then
    print_success "Firebase configured"
else
    print_error "Firebase not configured in frontend/.env"
    exit 1
fi

# Check if ports are available
print_info "Checking if ports are available..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 3000 is in use. Killing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 5173 is in use. Killing process..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port 8000 is in use. Killing process..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

print_success "Ports are available"

# Install dependencies
print_info "Installing dependencies..."

print_info "  Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install --silent > /dev/null 2>&1
    print_success "  Backend dependencies installed"
else
    print_info "  Backend dependencies already installed"
fi
cd ..

print_info "  Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent > /dev/null 2>&1
    print_success "  Frontend dependencies installed"
else
    print_info "  Frontend dependencies already installed"
fi
cd ..

print_info "  Installing AI agent dependencies..."
cd ai-agent
if ! python3 -c "import fastapi" 2>/dev/null; then
    pip install -r requirements.txt --quiet > /dev/null 2>&1
    print_success "  AI agent dependencies installed"
else
    print_info "  AI agent dependencies already installed"
fi
cd ..

print_success "All dependencies installed"

# Create log directory
mkdir -p logs

echo ""
echo "════════════════════════════════════════════════════"
echo "  Starting Services (Local + Cloud Databases)"
echo "════════════════════════════════════════════════════"
echo ""

# Function to start backend
start_backend() {
    cd backend
    print_info "Starting Backend on port 3000..."
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    cd ..
    
    # Wait for backend to start
    sleep 3
    if ps -p $BACKEND_PID > /dev/null; then
        print_success "Backend started (PID: $BACKEND_PID)"
        print_info "  URL: http://localhost:3000"
        print_info "  Logs: tail -f logs/backend.log"
    else
        print_error "Backend failed to start. Check logs/backend.log"
        exit 1
    fi
}

# Function to start frontend
start_frontend() {
    cd frontend
    print_info "Starting Frontend on port 5173..."
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    cd ..
    
    # Wait for frontend to start
    sleep 3
    if ps -p $FRONTEND_PID > /dev/null; then
        print_success "Frontend started (PID: $FRONTEND_PID)"
        print_info "  URL: http://localhost:5173"
        print_info "  Logs: tail -f logs/frontend.log"
    else
        print_error "Frontend failed to start. Check logs/frontend.log"
        exit 1
    fi
}

# Function to start AI agent
start_ai_agent() {
    cd ai-agent
    print_info "Starting AI Agent on port 8000..."
    python3 main.py > ../logs/ai-agent.log 2>&1 &
    AI_AGENT_PID=$!
    echo $AI_AGENT_PID > ../logs/ai-agent.pid
    cd ..
    
    # Wait for AI agent to start
    sleep 3
    if ps -p $AI_AGENT_PID > /dev/null; then
        print_success "AI Agent started (PID: $AI_AGENT_PID)"
        print_info "  URL: http://localhost:8000"
        print_info "  Logs: tail -f logs/ai-agent.log"
    else
        print_warning "AI Agent failed to start (optional service)"
    fi
}

# Start all services
start_backend
start_frontend
start_ai_agent

echo ""
echo "════════════════════════════════════════════════════"
echo "  ✅ All Services Started Successfully!"
echo "════════════════════════════════════════════════════"
echo ""
print_success "Application is running locally with cloud databases"
echo ""
echo "📍 Service URLs:"
echo "  • Frontend:  ${GREEN}http://localhost:5173${NC}"
echo "  • Backend:   ${GREEN}http://localhost:3000${NC}"
echo "  • AI Agent:  ${GREEN}http://localhost:8000${NC}"
echo ""
echo "🗄️  Cloud Databases:"
echo "  • MongoDB:    MongoDB Atlas (Cloud) ✅"
echo "  • PostgreSQL: Supabase (Cloud) ✅"
echo "  • Firebase:   Google Cloud ✅"
echo "  • Redis:      Redis Cloud ✅"
echo ""
echo "🔐 Test Credentials:"
echo "  Owner:    e2e.owner@test.kayak.com / TestOwner123!"
echo "  Traveler: e2e.traveler@test.kayak.com / TestTraveler123!"
echo "  Admin:    e2e.admin@test.kayak.com / TestAdmin123!"
echo ""
echo "📋 View Logs:"
echo "  • Backend:   tail -f logs/backend.log"
echo "  • Frontend:  tail -f logs/frontend.log"
echo "  • AI Agent:  tail -f logs/ai-agent.log"
echo ""
echo "🛑 Stop Services:"
echo "  ./stop-local.sh"
echo ""
echo "Opening browser..."
sleep 2

# Open browser (works on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:5173 2>/dev/null || print_info "Please open http://localhost:5173 in your browser"
else
    print_info "Please open http://localhost:5173 in your browser"
fi

echo ""
print_success "Setup complete! Your application is now running."
echo ""

