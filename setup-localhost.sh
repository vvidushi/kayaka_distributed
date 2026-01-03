#!/bin/bash

# Kayak Clone - Localhost Setup Script
# This script automates the setup of environment files for local development

set -e  # Exit on error

echo "=================================================="
echo "Kayak Clone - Localhost Setup"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_info "Starting localhost setup..."
echo ""

# ===================================================
# 1. Setup Backend Environment
# ===================================================
echo "1. Setting up Backend environment..."

if [ -f "backend/.env" ]; then
    print_warning "backend/.env already exists"
    read -p "   Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Skipping backend .env setup"
    else
        cp backend/env.localhost.template backend/.env
        print_success "Created backend/.env from template"
    fi
else
    cp backend/env.localhost.template backend/.env
    print_success "Created backend/.env from template"
fi

# Generate secrets if backend/.env was created/updated
if [ -f "backend/.env" ]; then
    print_info "Generating secure secrets..."
    cd backend
    
    # Check if Node.js is available
    if command -v node &> /dev/null; then
        # Generate secrets
        SECRETS=$(node scripts/generate-secrets.js 2>/dev/null || echo "")
        
        if [ -n "$SECRETS" ]; then
            # Extract JWT_SECRET and SESSION_SECRET
            JWT_SECRET=$(echo "$SECRETS" | grep "JWT_SECRET=" | cut -d'=' -f2)
            SESSION_SECRET=$(echo "$SECRETS" | grep "SESSION_SECRET=" | cut -d'=' -f2)
            
            # Update .env file
            if [ "$(uname)" == "Darwin" ]; then
                # macOS
                sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
                sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
            else
                # Linux
                sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
                sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
            fi
            
            print_success "Generated and saved secure JWT and Session secrets"
        else
            print_warning "Could not generate secrets automatically"
            print_info "Please run: cd backend && node scripts/generate-secrets.js"
        fi
    else
        print_warning "Node.js not found - cannot generate secrets"
        print_info "Please install Node.js and run: cd backend && node scripts/generate-secrets.js"
    fi
    
    cd ..
fi

echo ""

# ===================================================
# 2. Setup Frontend Environment
# ===================================================
echo "2. Setting up Frontend environment..."

if [ -f "frontend/.env" ]; then
    print_warning "frontend/.env already exists"
    read -p "   Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Skipping frontend .env setup"
    else
        cp frontend/env.localhost.template frontend/.env
        print_success "Created frontend/.env from template"
    fi
else
    cp frontend/env.localhost.template frontend/.env
    print_success "Created frontend/.env from template"
fi

echo ""

# ===================================================
# 3. Setup AI Agent Environment
# ===================================================
echo "3. Setting up AI Agent environment..."

if [ -f "ai-agent/.env" ]; then
    print_warning "ai-agent/.env already exists"
    read -p "   Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Skipping ai-agent .env setup"
    else
        cp ai-agent/env.localhost.template ai-agent/.env
        print_success "Created ai-agent/.env from template"
    fi
else
    cp ai-agent/env.localhost.template ai-agent/.env
    print_success "Created ai-agent/.env from template"
fi

echo ""

# ===================================================
# 4. Start MongoDB
# ===================================================
echo "4. Starting MongoDB..."

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    print_info "Starting MongoDB via Docker Compose..."
    docker-compose up -d mongodb
    
    # Wait for MongoDB to be ready
    print_info "Waiting for MongoDB to be ready..."
    sleep 5
    
    if docker ps | grep -q kayak-mongodb; then
        print_success "MongoDB is running on localhost:27017"
    else
        print_error "MongoDB failed to start"
        print_info "Check logs with: docker logs kayak-mongodb"
    fi
else
    print_warning "Docker or Docker Compose not found"
    print_info "Please install Docker and run: docker-compose up -d mongodb"
fi

echo ""

# ===================================================
# 5. Summary and Next Steps
# ===================================================
echo "=================================================="
echo "Setup Complete!"
echo "=================================================="
echo ""

print_success "Environment files created:"
echo "  • backend/.env"
echo "  • frontend/.env"
echo "  • ai-agent/.env"
echo ""

print_info "Next Steps:"
echo ""
echo "1. Configure Firebase Authentication:"
echo "   • Visit: https://console.firebase.google.com/"
echo "   • Get credentials and update backend/.env and frontend/.env"
echo "   • See: docs/FIREBASE_SETUP.md for detailed instructions"
echo ""

echo "2. Install Dependencies:"
echo "   ${BLUE}cd backend && npm install${NC}"
echo "   ${BLUE}cd frontend && npm install${NC}"
echo "   ${BLUE}cd ai-agent && pip install -r requirements.txt${NC}"
echo ""

echo "3. (Optional) Seed Database:"
echo "   ${BLUE}cd backend${NC}"
echo "   ${BLUE}npm run seed:us${NC}           # Load sample data"
echo "   ${BLUE}npm run seed:test-users${NC}   # Create test users"
echo ""

echo "4. Start Services (in separate terminals):"
echo "   Terminal 1: ${BLUE}cd backend && npm run dev${NC}"
echo "   Terminal 2: ${BLUE}cd frontend && npm run dev${NC}"
echo "   Terminal 3: ${BLUE}cd ai-agent && python main.py${NC}"
echo ""

echo "5. Access the Application:"
echo "   • Frontend:  ${GREEN}http://localhost:5173${NC}"
echo "   • Backend:   ${GREEN}http://localhost:3000${NC}"
echo "   • AI Agent:  ${GREEN}http://localhost:8000${NC}"
echo ""

print_info "For detailed setup instructions, see: LOCALHOST_SETUP.md"
echo ""

print_warning "Important: Update Firebase credentials in .env files before starting!"
echo ""

echo "=================================================="

