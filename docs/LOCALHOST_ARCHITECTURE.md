# Localhost Architecture

This document describes the architecture when running the Kayak Clone application entirely on localhost.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                              │
│                      http://localhost:5173                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP/WebSocket
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                          │
│                      localhost:5173                                 │
│                                                                     │
│  • React 18 with Redux Toolkit                                     │
│  • Tailwind CSS for styling                                        │
│  • Firebase Auth SDK (client-side)                                 │
│  • WebSocket client for real-time updates                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ REST API / WebSocket
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                             │
│                      localhost:3000                                 │
│                                                                     │
│  • Express.js REST API                                             │
│  • JWT Authentication                                               │
│  • Session Management                                               │
│  • WebSocket Server (Socket.IO)                                    │
│  • Kafka Producer/Consumer (optional)                              │
└──────┬─────────────┬─────────────┬──────────────┬───────────────────┘
       │             │             │              │
       │             │             │              │ HTTP API
       │             │             │              ↓
       │             │             │     ┌─────────────────────┐
       │             │             │     │   AI AGENT          │
       │             │             │     │   localhost:8000    │
       │             │             │     │                     │
       │             │             │     │ • FastAPI/Python    │
       │             │             │     │ • LangChain         │
       │             │             │     │ • Intent Parser     │
       │             │             │     │ • Query Generator   │
       │             │             │     └──────────┬──────────┘
       │             │             │                │
       │             │             │                │
       ↓             ↓             ↓                ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│ MongoDB  │  │ Firebase │  │PostgreSQL│  │   MongoDB    │
│localhost │  │ (Cloud)  │  │(Optional)│  │  localhost   │
│  :27017  │  │  Auth +  │  │localhost │  │    :27017    │
│          │  │ Storage  │  │  :5432   │  │              │
│ • flights│  │          │  │          │  │ • sessions   │
│ • hotels │  │ • Users  │  │ • users  │  │ • analytics  │
│ • cars   │  │ • Images │  │ • bookings│ │ • deals      │
│ • reviews│  │          │  │ • payments│ │              │
└──────────┘  └──────────┘  └──────────┘  └──────────────┘
```

## Component Details

### Frontend (localhost:5173)
- **Technology:** React 18, Redux Toolkit, Tailwind CSS
- **Purpose:** User interface for browsing and booking travel
- **Key Features:**
  - Search flights, hotels, cars
  - User authentication (Firebase)
  - Booking management
  - AI chat widget
  - Real-time updates via WebSocket

### Backend (localhost:3000)
- **Technology:** Node.js, Express.js
- **Purpose:** Main API server and business logic
- **Key Features:**
  - RESTful API endpoints
  - JWT-based authentication
  - Session management
  - MongoDB queries for listings
  - PostgreSQL for transactional data (optional)
  - WebSocket server for real-time updates
  - Kafka integration (optional)

### AI Agent (localhost:8000)
- **Technology:** Python, FastAPI, LangChain
- **Purpose:** Natural language processing and intelligent search
- **Key Features:**
  - Intent parsing from user queries
  - MongoDB query generation
  - Bundle building (flights + hotels)
  - Deal processing
  - Conversational AI

### MongoDB (localhost:27017)
- **Technology:** MongoDB 7.0 (Docker)
- **Purpose:** Primary data store for listings and analytics
- **Collections:**
  - `flights` - Flight listings
  - `hotels` - Hotel listings
  - `cars` - Car rental listings
  - `reviews` - User reviews
  - `concierge_sessions` - AI chat sessions
  - `watches` - Price/inventory watches
  - `user_traces` - Analytics data

### Firebase (Cloud)
- **Technology:** Firebase Authentication & Storage
- **Purpose:** User authentication and image storage
- **Features:**
  - Email/password authentication
  - Social login (Google, etc.)
  - Image storage for listings
  - Profile pictures

### PostgreSQL (localhost:5432) - Optional
- **Technology:** PostgreSQL (Supabase or local)
- **Purpose:** Transactional data (if needed)
- **Tables:**
  - `users` - User profiles
  - `bookings` - Booking records
  - `payments` - Payment transactions
  - `reviews` - Review metadata

## Data Flow

### 1. User Search Flow

```
User → Frontend → Backend → MongoDB
                     ↓
                  AI Agent → MongoDB
                     ↓
                  Backend → Frontend → User
```

1. User enters search query in frontend
2. Frontend sends request to backend API
3. Backend may call AI Agent for natural language processing
4. AI Agent parses intent and generates MongoDB query
5. Backend executes query on MongoDB
6. Results returned to frontend
7. Frontend displays results to user

### 2. Booking Flow

```
User → Frontend → Backend → PostgreSQL (optional)
                     ↓
                  MongoDB (booking metadata)
                     ↓
                  Firebase (user verification)
                     ↓
                  Backend → Frontend → User
```

1. User selects item and proceeds to checkout
2. Frontend sends booking request to backend
3. Backend verifies user with Firebase
4. Backend creates booking record in PostgreSQL (or MongoDB)
5. Backend stores booking metadata in MongoDB
6. Confirmation sent to frontend
7. User receives booking confirmation

### 3. Real-time Updates Flow

```
Backend Event → WebSocket Server → Connected Clients
```

1. Backend detects event (price change, new deal, etc.)
2. Backend emits event via WebSocket
3. All connected frontend clients receive update
4. Frontend updates UI in real-time

## Network Ports

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Frontend | 5173 | HTTP | Web UI |
| Backend | 3000 | HTTP/WS | API + WebSocket |
| AI Agent | 8000 | HTTP | AI services |
| MongoDB | 27017 | TCP | Database |
| PostgreSQL | 5432 | TCP | Database (optional) |
| Redis | 6379 | TCP | Cache (optional) |
| Kafka | 9092 | TCP | Event streaming (optional) |

## Environment Configuration

### Minimal Setup (Localhost Only)

**Required:**
- MongoDB (localhost:27017)
- Firebase (cloud - auth only)

**Optional:**
- PostgreSQL (localhost:5432)
- Redis (localhost:6379)
- Kafka (localhost:9092)

### Environment Files

```
backend/.env
├── MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
├── JWT_SECRET=<generated>
├── SESSION_SECRET=<generated>
├── FIREBASE_* (cloud credentials)
├── AI_AGENT_URL=http://localhost:8000
└── CACHE_ENABLED=false

frontend/.env
├── VITE_API_URL=http://localhost:3000
└── VITE_FIREBASE_* (cloud credentials)

ai-agent/.env
├── MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
└── BACKEND_API_URL=http://localhost:3000
```

## Startup Sequence

### 1. Start MongoDB
```bash
docker-compose up -d mongodb
```

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Start AI Agent
```bash
cd ai-agent
pip install -r requirements.txt
python main.py
```

## Development Workflow

### Code Changes

```
1. Make code changes
2. Services auto-reload (hot reload enabled)
3. Test changes in browser
4. Repeat
```

### Database Changes

```
1. Update schema/models
2. Run migrations (if using PostgreSQL)
3. Restart services
4. Test changes
```

### Adding New Features

```
1. Update backend API
2. Update frontend components
3. Update AI agent (if needed)
4. Test end-to-end
5. Commit changes
```

## Advantages of Localhost Setup

✅ **No Cloud Costs** - Everything runs locally (except Firebase)
✅ **Fast Development** - No network latency
✅ **Offline Capable** - Works without internet (except Firebase auth)
✅ **Easy Debugging** - All logs accessible locally
✅ **Data Privacy** - All data stays on your machine
✅ **Quick Iteration** - Instant feedback on changes

## Limitations

⚠️ **Firebase Required** - Still need cloud Firebase for auth
⚠️ **Single Machine** - Can't scale horizontally
⚠️ **No High Availability** - Single point of failure
⚠️ **Limited Resources** - Constrained by local machine
⚠️ **Not Production-Ready** - Development only

## Transitioning to Cloud

When ready for production, update environment variables:

```diff
# Backend
- MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
+ MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kayak

- AI_AGENT_URL=http://localhost:8000
+ AI_AGENT_URL=https://ai-agent.yourdomain.com

# Frontend
- VITE_API_URL=http://localhost:3000
+ VITE_API_URL=https://api.yourdomain.com
```

No code changes required - just environment variables!

## Monitoring & Debugging

### Logs

```bash
# Backend logs
cd backend && npm run dev
# Watch console output

# Frontend logs
cd frontend && npm run dev
# Watch console output + browser console

# AI Agent logs
cd ai-agent && python main.py
# Watch console output

# MongoDB logs
docker logs kayak-mongodb
```

### Database Access

```bash
# MongoDB Shell
docker exec -it kayak-mongodb mongosh -u root -p password

# MongoDB Compass (GUI)
# Connect to: mongodb://root:password@localhost:27017
```

### Health Checks

```bash
# Backend health
curl http://localhost:3000/health

# AI Agent health
curl http://localhost:8000/health

# MongoDB health
docker exec kayak-mongodb mongosh --eval "db.adminCommand('ping')"
```

## Troubleshooting

### Port Conflicts

```bash
# Find process using port
lsof -ti:3000

# Kill process
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Restart MongoDB
docker-compose restart mongodb

# Check logs
docker logs kayak-mongodb
```

### Service Not Starting

```bash
# Check if dependencies are installed
cd backend && npm install
cd frontend && npm install
cd ai-agent && pip install -r requirements.txt

# Check environment variables
cat backend/.env
cat frontend/.env
cat ai-agent/.env
```

## Related Documentation

- [Localhost Setup Guide](../LOCALHOST_SETUP.md)
- [Environment Variables Reference](../ENV_REFERENCE.md)
- [Database Architecture](DATABASE_ARCHITECTURE.md)
- [Project Overview](PROJECT_OVERVIEW.md)

