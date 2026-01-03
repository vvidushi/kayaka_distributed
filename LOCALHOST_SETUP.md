# Localhost Setup Guide

This guide will help you set up the Kayak Clone application to run entirely on localhost using local databases instead of cloud services.

## Quick Setup

Run the automated setup script:

```bash
./setup-localhost.sh
```

This will:
1. Copy environment template files to `.env` files
2. Generate secure JWT and session secrets
3. Start MongoDB via Docker Compose
4. Display next steps for Firebase configuration

## Manual Setup

If you prefer to set up manually, follow these steps:

### 1. Prerequisites

- **Node.js** (v20+)
- **Python** (v3.12+) for AI agent
- **Docker & Docker Compose** (for MongoDB)
- **Firebase Account** (for authentication)

### 2. Start MongoDB

The project includes MongoDB in docker-compose.yml. Start it:

```bash
docker-compose up -d mongodb
```

This starts MongoDB on `localhost:27017` with:
- Username: `root`
- Password: `password`
- Database: `kayak`

### 3. Configure Backend

```bash
cd backend

# Copy the localhost template
cp env.localhost.template .env

# Generate secure secrets
node scripts/generate-secrets.js

# Copy the generated secrets to your .env file
```

Edit `backend/.env` and update:

#### Required Configuration:

**Database (Already configured for localhost):**
```env
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
CACHE_ENABLED=false
```

**Security Secrets:**
Replace these with the output from `generate-secrets.js`:
```env
JWT_SECRET=<your-generated-jwt-secret>
SESSION_SECRET=<your-generated-session-secret>
```

**Firebase Authentication:**
Get these from [Firebase Console](https://console.firebase.google.com/):
1. Go to Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Copy the values to your `.env` file:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="your-firebase-private-key-here"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

See [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) for detailed Firebase setup instructions.

### 4. Configure Frontend

```bash
cd frontend

# Copy the localhost template
cp env.localhost.template .env
```

Edit `frontend/.env` and update:

**API URL (Already configured for localhost):**
```env
VITE_API_URL=http://localhost:3000
```

**Firebase Client Configuration:**
Get these from [Firebase Console](https://console.firebase.google.com/):
1. Go to Project Settings > General
2. Scroll to "Your Apps" section
3. Click on your web app or create one
4. Copy the config values:

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### 5. Configure AI Agent

```bash
cd ai-agent

# Copy the localhost template
cp env.localhost.template .env
```

Edit `ai-agent/.env` and update:

**Database (Already configured for localhost):**
```env
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
BACKEND_API_URL=http://localhost:3000
```

**AI/LLM Configuration (Optional):**
If you want to use AI features, add your API keys:

```env
# For OpenAI
OPENAI_API_KEY=your-openai-api-key

# OR for Anthropic Claude
ANTHROPIC_API_KEY=your-anthropic-api-key

# OR for Google AI
GOOGLE_AI_API_KEY=your-google-api-key
```

### 6. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# AI Agent
cd ../ai-agent
pip install -r requirements.txt
# OR using uv (faster)
uv pip install -r requirements.txt
```

### 7. Seed Database (Optional)

Load sample data for testing:

```bash
cd backend

# Load US flight, hotel, and car data
npm run seed:us

# Create test users
npm run seed:test-users

# Create MongoDB indexes for better performance
node scripts/create-indexes.js
```

### 8. Start Services

Open three terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend will run on http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:5173

**Terminal 3 - AI Agent:**
```bash
cd ai-agent
python main.py
# OR using uvicorn
uvicorn main:app --reload --port 8000
```
AI Agent will run on http://localhost:8000

### 9. Access the Application

Open your browser and navigate to:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **AI Agent API:** http://localhost:8000
- **API Docs:** http://localhost:3000/api-docs (if enabled)

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  localhost:5173 │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌─────────────────┐
│   Backend       │─────→│   AI Agent      │
│  localhost:3000 │      │  localhost:8000 │
└────────┬────────┘      └────────┬────────┘
         │                        │
         ↓                        ↓
┌─────────────────┐      ┌─────────────────┐
│   MongoDB       │      │   MongoDB       │
│  localhost:27017│      │  localhost:27017│
└─────────────────┘      └─────────────────┘
         │
         ↓
┌─────────────────┐
│   Firebase      │
│  (Cloud Auth)   │
└─────────────────┘
```

## Database Configuration Summary

### MongoDB (Local)
- **Host:** localhost:27017
- **Username:** root
- **Password:** password
- **Database:** kayak
- **Connection String:** `mongodb://root:password@localhost:27017/kayak?authSource=admin`

### PostgreSQL (Optional)
If you need PostgreSQL for some features, you can use Supabase (cloud) or run locally:

**Local PostgreSQL:**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/kayak
```

**Supabase (Cloud):**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

### Redis (Optional)
Redis is optional and disabled by default (`CACHE_ENABLED=false`).

**To enable local Redis:**
1. Add Redis to docker-compose.yml or run separately
2. Update backend/.env:
```env
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true
```

## Troubleshooting

### MongoDB Connection Issues

**Problem:** Can't connect to MongoDB
**Solution:**
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# If not running, start it
docker-compose up -d mongodb

# Check logs
docker logs kayak-mongodb
```

### Port Already in Use

**Problem:** Port 3000, 5173, or 8000 already in use
**Solution:**
```bash
# Find and kill the process using the port
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

Or change the port in the respective `.env` files.

### Firebase Authentication Errors

**Problem:** Firebase authentication not working
**Solution:**
1. Verify Firebase credentials in both backend and frontend `.env` files
2. Ensure Firebase project has Authentication enabled
3. Add `localhost` to authorized domains in Firebase Console
4. Check that the private key is properly formatted with `\n` for newlines

### Missing Dependencies

**Problem:** Module not found errors
**Solution:**
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install

# AI Agent
cd ai-agent && pip install -r requirements.txt
```

## Next Steps

1. **Create an admin user** - Register through the UI and manually update the role in MongoDB:
```javascript
// In MongoDB shell or MongoDB Compass
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

2. **Load sample data** - Use the seed scripts to populate the database

3. **Explore the API** - Visit http://localhost:3000/api-docs (if enabled)

4. **Run tests** - Execute the test suites:
```bash
# Backend tests
cd backend && npm test

# E2E tests
cd e2e && npm test
```

## Environment Files Summary

| Service | Template File | Target File | Purpose |
|---------|--------------|-------------|---------|
| Backend | `backend/env.localhost.template` | `backend/.env` | Backend API configuration |
| Frontend | `frontend/env.localhost.template` | `frontend/.env` | Frontend app configuration |
| AI Agent | `ai-agent/env.localhost.template` | `ai-agent/.env` | AI agent service configuration |

## Additional Resources

- [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
- [Database Architecture](docs/DATABASE_ARCHITECTURE.md)
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Backend Secrets Guide](backend/docs/SECRETS.md)
- [Database Setup Guide](backend/docs/DATABASE_SETUP.md)

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Generate unique secrets** - Use `generate-secrets.js` for production
3. **Rotate secrets regularly** - Change JWT and session secrets periodically
4. **Use strong passwords** - For MongoDB and other services
5. **Keep Firebase keys secure** - Never expose in client-side code
6. **Update .gitignore** - Ensure all sensitive files are ignored

## Production Deployment

This localhost setup is for development only. For production:

1. Use managed database services (MongoDB Atlas, Supabase)
2. Use environment variables from secure secret management
3. Enable HTTPS/TLS for all connections
4. Configure proper CORS policies
5. Set up monitoring and logging
6. Use production-grade secrets (longer, more complex)
7. Enable rate limiting and security headers

See the [AWS Infrastructure Guide](infra/aws/README.md) for production deployment instructions.

