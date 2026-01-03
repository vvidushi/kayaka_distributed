# Kayak Clone - Quick Reference Card

## 🚀 Quick Start (Localhost)

```bash
# 1. Automated setup
./setup-localhost.sh

# 2. Update Firebase credentials in .env files
# backend/.env - Add FIREBASE_* variables
# frontend/.env - Add VITE_FIREBASE_* variables

# 3. Start MongoDB
docker-compose up -d mongodb

# 4. Install dependencies
cd backend && npm install
cd frontend && npm install
cd ai-agent && pip install -r requirements.txt

# 5. Start services (3 separate terminals)
cd backend && npm run dev      # Terminal 1
cd frontend && npm run dev     # Terminal 2
cd ai-agent && python main.py  # Terminal 3
```

## 🌐 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Web UI |
| Backend | http://localhost:3000 | API Server |
| AI Agent | http://localhost:8000 | AI Services |
| MongoDB | localhost:27017 | Database |

## 📁 Environment Files

### Backend (.env)
```env
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
JWT_SECRET=<generate with: node scripts/generate-secrets.js>
SESSION_SECRET=<generate with: node scripts/generate-secrets.js>
AI_AGENT_URL=http://localhost:8000
CACHE_ENABLED=false
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-firebase-private-key-here"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### AI Agent (.env)
```env
PORT=8000
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
BACKEND_API_URL=http://localhost:3000
OPENAI_API_KEY=sk-... (optional)
```

## 🔑 Generate Secrets

```bash
cd backend
node scripts/generate-secrets.js
```

Copy output to `backend/.env`

## 🗄️ Database Commands

```bash
# Start MongoDB
docker-compose up -d mongodb

# Stop MongoDB
docker-compose down mongodb

# MongoDB Shell
docker exec -it kayak-mongodb mongosh -u root -p password

# View logs
docker logs kayak-mongodb

# Seed database
cd backend
npm run seed:us           # Load sample data
npm run seed:test-users   # Create test users
node scripts/create-indexes.js  # Create indexes
```

## 🛠️ Common Commands

### Backend
```bash
cd backend
npm install              # Install dependencies
npm run dev              # Start dev server
npm test                 # Run tests
npm run lint             # Lint code
```

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
```

### AI Agent
```bash
cd ai-agent
pip install -r requirements.txt  # Install dependencies
python main.py                   # Start server
pytest                           # Run tests
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9   # Backend
lsof -ti:5173 | xargs kill -9   # Frontend
lsof -ti:8000 | xargs kill -9   # AI Agent
```

### MongoDB Not Starting
```bash
# Check status
docker ps | grep mongodb

# Restart
docker-compose restart mongodb

# Check logs
docker logs kayak-mongodb
```

### Can't Connect to MongoDB
```bash
# Verify connection string in .env
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin

# Test connection
docker exec kayak-mongodb mongosh -u root -p password --eval "db.adminCommand('ping')"
```

### Firebase Auth Errors
1. Check credentials in `backend/.env` and `frontend/.env`
2. Verify Firebase project is active
3. Add `localhost` to authorized domains in Firebase Console
4. Ensure private key has `\n` for newlines

### Module Not Found
```bash
# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install
cd ai-agent && pip install -r requirements.txt --force-reinstall
```

## 📊 Health Checks

```bash
# Backend
curl http://localhost:3000/health

# AI Agent
curl http://localhost:8000/health

# MongoDB
docker exec kayak-mongodb mongosh --eval "db.adminCommand('ping')"
```

## 🔍 View Logs

```bash
# Backend (in terminal running npm run dev)
# Frontend (in terminal running npm run dev + browser console)
# AI Agent (in terminal running python main.py)
# MongoDB
docker logs -f kayak-mongodb
```

## 📦 Database Collections (MongoDB)

| Collection | Purpose |
|------------|---------|
| `flights` | Flight listings |
| `hotels` | Hotel listings |
| `cars` | Car rental listings |
| `reviews` | User reviews |
| `concierge_sessions` | AI chat sessions |
| `watches` | Price/inventory watches |
| `user_traces` | Analytics data |

## 🎯 Test Users (After Seeding)

```javascript
// Create via frontend or seed script
{
  email: "test@example.com",
  password: "Test123!",
  role: "user"
}

// Make admin (in MongoDB shell)
db.users.updateOne(
  { email: "test@example.com" },
  { $set: { role: "admin" } }
)
```

## 🔐 Security Checklist

- [ ] Generate unique JWT_SECRET and SESSION_SECRET
- [ ] Never commit .env files
- [ ] Keep Firebase credentials secure
- [ ] Use strong MongoDB passwords in production
- [ ] Enable HTTPS in production
- [ ] Rotate secrets regularly
- [ ] Use environment-specific secrets

## 📚 Documentation Links

| Document | Description |
|----------|-------------|
| [LOCALHOST_SETUP.md](LOCALHOST_SETUP.md) | Complete localhost setup guide |
| [ENV_REFERENCE.md](ENV_REFERENCE.md) | All environment variables |
| [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) | Firebase configuration |
| [docs/LOCALHOST_ARCHITECTURE.md](docs/LOCALHOST_ARCHITECTURE.md) | System architecture |
| [backend/docs/SECRETS.md](backend/docs/SECRETS.md) | Security secrets guide |
| [backend/docs/DATABASE_SETUP.md](backend/docs/DATABASE_SETUP.md) | Database configuration |

## 🎨 Project Structure

```
kayak-clone/
├── backend/          # Express.js API
├── frontend/         # React UI
├── ai-agent/         # Python AI service
├── docs/             # Documentation
├── e2e/              # E2E tests
├── infra/            # Infrastructure (AWS, Terraform)
├── docker-compose.yml
├── LOCALHOST_SETUP.md
├── ENV_REFERENCE.md
└── QUICK_REFERENCE.md (this file)
```

## 🚦 Development Workflow

1. **Make changes** to code
2. **Services auto-reload** (hot reload enabled)
3. **Test in browser** at http://localhost:5173
4. **Check logs** in terminal windows
5. **Commit changes** when ready

## 🌟 Key Features

- ✈️ Flight search and booking
- 🏨 Hotel search and booking
- 🚗 Car rental search and booking
- 🤖 AI-powered concierge chat
- 👤 User authentication (Firebase)
- 💳 Payment processing
- ⭐ Reviews and ratings
- 📊 Admin dashboard
- 📈 Analytics tracking
- 🔔 Real-time notifications (WebSocket)

## 📞 Getting Help

1. Check this quick reference
2. Read [LOCALHOST_SETUP.md](LOCALHOST_SETUP.md)
3. Check [ENV_REFERENCE.md](ENV_REFERENCE.md)
4. Review error logs
5. Search documentation in `docs/`

## 🎓 Learning Resources

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Firebase Docs](https://firebase.google.com/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [LangChain Docs](https://python.langchain.com/)

---

**Pro Tip:** Keep this file open in a separate window while developing!

**Last Updated:** December 2025

