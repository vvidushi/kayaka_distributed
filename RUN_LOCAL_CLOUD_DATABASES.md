# Run Locally with Cloud Databases (No Docker)

This guide shows how to run the Kayak application **locally on your machine** (without Docker) while connecting to **all cloud databases**.

## 🎯 Overview

- ✅ **Backend, Frontend, AI Agent**: Run locally on your machine
- ✅ **MongoDB**: Cloud (MongoDB Atlas)
- ✅ **PostgreSQL**: Cloud (Supabase)
- ✅ **Firebase**: Cloud (Google)
- ✅ **Redis**: Cloud (Redis Labs)
- ❌ **NO Docker containers**
- ❌ **NO local databases**

---

## 📋 Prerequisites

### Required Software:
- **Node.js 20+** - For backend and frontend
- **Python 3.12+** - For AI agent
- **npm** or **yarn** - Package manager

### Verify Installations:
```bash
node --version    # Should be v20+
npm --version     # Should be 10+
python --version  # Should be 3.12+
```

---

## 🚀 Quick Start

### 1. Stop Docker Containers (If Running)
```bash
cd /Users/gouravdhama/Documents/bubu/ditributed/project/latest/Kayak-clone-development3
docker-compose down
```

### 2. Run Setup Script
```bash
./run-local-cloud.sh
```

This will:
- Verify cloud database connections
- Install dependencies
- Start all services locally
- Open the application in your browser

---

## 📝 Manual Setup

### Step 1: Environment Configuration

Your `.env` files already have cloud database configurations. Verify they're correct:

**Backend `.env`:**
```bash
cd backend
cat .env | grep -E "MONGODB_URI|DATABASE_URL|FIREBASE|REDIS_URL"
```

Should show:
- `MONGODB_URI=mongodb+srv://...@hiruzen.yzkuzxj.mongodb.net/kayak` ✅ Cloud
- `DATABASE_URL=postgresql://...@aws-1-us-east-1.pooler.supabase.com:5432/postgres` ✅ Cloud
- `REDIS_URL=redis://...@redis-19566.c90.us-east-1-3.ec2.cloud.redislabs.com:19566` ✅ Cloud
- `FIREBASE_*` credentials ✅ Cloud

**Frontend `.env`:**
```bash
cd frontend
cat .env | grep VITE_
```

Should show:
- `VITE_API_URL=http://localhost:3000` (local backend)
- `VITE_FIREBASE_*` credentials ✅ Cloud

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

**AI Agent:**
```bash
cd ai-agent
pip install -r requirements.txt
# OR using uv (faster)
uv pip install -r requirements.txt
```

### Step 3: Start Services

**Open 3 Terminal Windows:**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Backend will run on: http://localhost:3000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend will run on: http://localhost:5173

**Terminal 3 - AI Agent:**
```bash
cd ai-agent
python main.py
# OR
uvicorn main:app --reload --port 8000
```
✅ AI Agent will run on: http://localhost:8000

### Step 4: Access Application

Open your browser: http://localhost:5173

---

## 🔍 Verify Cloud Connections

### Test Backend Connection:
```bash
curl http://localhost:3000/health/live
```

Expected: `{"status":"alive","timestamp":"..."}`

### Test MongoDB Atlas Connection:
```bash
cd backend
node -e "
import('./src/config/database.js').then(async ({ getMongoDB }) => {
  const db = await getMongoDB();
  const stats = await db.stats();
  console.log('✅ Connected to MongoDB Atlas');
  console.log('Database:', stats.db);
  console.log('Collections:', stats.collections);
  process.exit(0);
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});
"
```

### Test All Connections:
```bash
cd backend
node scripts/test-cloud-connections.js
```

---

## 📊 Architecture (Local Run + Cloud DBs)

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR LOCAL MACHINE                   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │  │   Backend    │  │   AI Agent   │ │
│  │ localhost:   │  │ localhost:   │  │ localhost:   │ │
│  │    5173      │→ │    3000      │→ │    8000      │ │
│  └──────────────┘  └───────┬──────┘  └───────┬──────┘ │
│                            │                  │         │
└────────────────────────────┼──────────────────┼─────────┘
                             │                  │
                             ↓                  ↓
              ┌──────────────────────────────────────────┐
              │         CLOUD SERVICES                   │
              │                                          │
              │  ┌────────────┐  ┌─────────────┐       │
              │  │  MongoDB   │  │  Supabase   │       │
              │  │   Atlas    │  │ PostgreSQL  │       │
              │  │  (Cloud)   │  │  (Cloud)    │       │
              │  └────────────┘  └─────────────┘       │
              │                                          │
              │  ┌────────────┐  ┌─────────────┐       │
              │  │  Firebase  │  │   Redis     │       │
              │  │   Auth +   │  │   Cloud     │       │
              │  │  Storage   │  │  (Cloud)    │       │
              │  └────────────┘  └─────────────┘       │
              └──────────────────────────────────────────┘
```

---

## 🔐 Test Credentials

### Owner Account (for dashboard):
- **Email:** `e2e.owner@test.kayak.com`
- **Password:** `TestOwner123!`

### Traveler Account:
- **Email:** `e2e.traveler@test.kayak.com`
- **Password:** `TestTraveler123!`

### Admin Account:
- **Email:** `e2e.admin@test.kayak.com`
- **Password:** `TestAdmin123!`

---

## 🛠️ Troubleshooting

### Backend won't start:
```bash
# Check if port 3000 is in use
lsof -ti:3000
# Kill the process if needed
lsof -ti:3000 | xargs kill -9

# Check environment variables
cd backend
node -e "console.log(process.env.MONGODB_URI)"
```

### Frontend won't start:
```bash
# Check if port 5173 is in use
lsof -ti:5173
# Kill the process if needed
lsof -ti:5173 | xargs kill -9

# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Can't connect to MongoDB Atlas:
```bash
# Test connection
cd backend
node -e "
import('./src/config/database.js').then(async ({ getMongoDB }) => {
  await getMongoDB();
  console.log('✅ Connected');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
"
```

### Module not found errors:
```bash
# Reinstall all dependencies
cd backend && npm install
cd frontend && npm install
cd ai-agent && pip install -r requirements.txt
```

---

## ⚡ Development Workflow

### Hot Reload:
All services have hot reload enabled:
- **Backend:** Changes auto-reload with nodemon
- **Frontend:** Changes auto-reload with Vite
- **AI Agent:** Changes auto-reload with uvicorn --reload

### Make Changes:
1. Edit code in your IDE
2. Save the file
3. Service automatically restarts
4. Refresh browser to see changes

### View Logs:
- **Backend:** Check Terminal 1
- **Frontend:** Check Terminal 2 + Browser Console
- **AI Agent:** Check Terminal 3

---

## 🧪 Testing

### Run Backend Tests:
```bash
cd backend
npm test
```

### Run E2E Tests:
```bash
cd e2e
npm test
```

---

## 🌟 Advantages of Local Run

### ✅ Benefits:
- **Faster Development:** No Docker build times
- **Better Debugging:** Direct access to logs
- **Hot Reload:** Instant code changes
- **IDE Integration:** Better debugging tools
- **Resource Efficient:** No container overhead
- **Easy Testing:** Direct Node.js debugging

### ✅ Still Cloud-Connected:
- All data in cloud databases
- No local database setup needed
- Production-like data access
- Team can share same data

---

## 📦 Production Deployment

When ready for production:

1. **Keep using cloud databases** (already configured)
2. **Deploy to cloud hosting:**
   - Backend → AWS, Heroku, Railway, etc.
   - Frontend → Vercel, Netlify, Cloudflare Pages
   - AI Agent → AWS Lambda, Google Cloud Run

3. **Use the same environment variables** (just update URLs)

---

## 🔄 Switch Back to Docker

If you want to use Docker again:

```bash
# Stop local services (Ctrl+C in each terminal)

# Start with Docker
docker-compose up -d

# Access at same URLs
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

---

## 📚 Additional Resources

- [Backend API Documentation](./api-docs/README.md)
- [Firebase Setup Guide](./docs/FIREBASE_SETUP.md)
- [Cloud Services Verification](./CLOUD_SERVICES_VERIFICATION.md)
- [Environment Variables Reference](./ENV_REFERENCE.md)

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Can login with test credentials
- [ ] Owner dashboard shows property counts
- [ ] MongoDB Atlas connection works
- [ ] Supabase connection works (if used)
- [ ] Firebase authentication works
- [ ] No Docker containers running (`docker ps` shows empty)

---

**You're now running locally with all cloud databases! 🚀**

No Docker, no local databases, just your code running on your machine connected to production-like cloud infrastructure.

