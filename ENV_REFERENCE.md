# Environment Variables Reference

Quick reference for all environment variables used in the Kayak Clone application.

## 📋 Table of Contents

- [Backend Environment Variables](#backend-environment-variables)
- [Frontend Environment Variables](#frontend-environment-variables)
- [AI Agent Environment Variables](#ai-agent-environment-variables)
- [Localhost vs Cloud Configuration](#localhost-vs-cloud-configuration)

---

## Backend Environment Variables

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `production` | Environment mode: `development`, `production`, `test` |
| `PORT` | No | `3000` | Port for backend server |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | **Yes** | - | MongoDB connection string |
| `DATABASE_URL` | No | - | PostgreSQL connection string (Supabase) |
| `REDIS_URL` | No | - | Redis connection string |
| `CACHE_ENABLED` | No | `false` | Enable/disable Redis caching: `true` or `false` |

**Localhost Examples:**
```env
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
DATABASE_URL=postgresql://postgres:password@localhost:5432/kayak
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=false
```

**Cloud Examples:**
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kayak?retryWrites=true&w=majority
DATABASE_URL=postgresql://postgres:pass@project.supabase.co:5432/postgres
REDIS_URL=redis://default:pass@redis-12345.cloud.redislabs.com:12345
CACHE_ENABLED=true
```

### Security & Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret for signing JWT tokens (min 64 chars) |
| `SESSION_SECRET` | **Yes** | - | Secret for session cookies (min 64 chars) |
| `JWT_EXPIRES_IN` | No | `24h` | JWT token expiration time |
| `SESSION_MAX_AGE` | No | `86400000` | Session max age in milliseconds (24h) |

**Generate Secrets:**
```bash
cd backend
node scripts/generate-secrets.js
```

### Firebase Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIREBASE_TYPE` | **Yes** | `service_account` | Firebase service account type |
| `FIREBASE_PROJECT_ID` | **Yes** | - | Firebase project ID |
| `FIREBASE_PRIVATE_KEY_ID` | **Yes** | - | Firebase private key ID |
| `FIREBASE_PRIVATE_KEY` | **Yes** | - | Firebase private key (with `\n` for newlines) |
| `FIREBASE_CLIENT_EMAIL` | **Yes** | - | Firebase service account email |
| `FIREBASE_CLIENT_ID` | **Yes** | - | Firebase client ID |
| `FIREBASE_AUTH_URI` | No | `https://accounts.google.com/o/oauth2/auth` | OAuth2 auth URI |
| `FIREBASE_TOKEN_URI` | No | `https://oauth2.googleapis.com/token` | OAuth2 token URI |
| `FIREBASE_AUTH_PROVIDER_X509_CERT_URL` | No | `https://www.googleapis.com/oauth2/v1/certs` | Auth provider cert URL |
| `FIREBASE_CLIENT_X509_CERT_URL` | **Yes** | - | Client cert URL |
| `FIREBASE_STORAGE_BUCKET` | **Yes** | - | Firebase storage bucket |

**Get Firebase Credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings > Service Accounts
3. Generate New Private Key
4. Copy values to `.env`

### Service URLs

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_AGENT_URL` | No | `http://ai-agent:8000` | URL to AI Agent service |
| `FRONTEND_URL` | No | `http://localhost:5173` | Frontend URL for CORS |

**Localhost:**
```env
AI_AGENT_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

**Docker Compose:**
```env
AI_AGENT_URL=http://ai-agent:8000
FRONTEND_URL=http://frontend:5173
```

### Kafka Configuration (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KAFKA_BROKERS` | No | - | Kafka broker addresses (comma-separated) |
| `KAFKA_CLIENT_ID` | No | `kayak-backend` | Kafka client ID |
| `KAFKA_GROUP_ID` | No | `kayak-consumer-group` | Kafka consumer group ID |
| `KAFKA_ENABLED` | No | `false` | Enable/disable Kafka: `true` or `false` |

**Example:**
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=kayak-backend
KAFKA_GROUP_ID=kayak-consumer-group
KAFKA_ENABLED=true
```

### File Upload Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_FILE_SIZE` | No | `5242880` | Max file size in bytes (5MB) |
| `ALLOWED_FILE_TYPES` | No | `image/jpeg,image/png,image/gif,image/webp` | Allowed MIME types |

---

## Frontend Environment Variables

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `production` | Environment mode: `development`, `production` |
| `VITE_API_URL` | **Yes** | - | Backend API URL |

**Localhost:**
```env
VITE_API_URL=http://localhost:3000
```

**Production:**
```env
VITE_API_URL=https://api.yourdomain.com
```

### Firebase Client Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_FIREBASE_API_KEY` | **Yes** | - | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | - | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | - | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Yes** | - | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes** | - | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | **Yes** | - | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | - | Firebase analytics measurement ID |

**Get Firebase Client Config:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings > General
3. Your Apps > Web App > Config
4. Copy values to `.env`

### Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_ENABLE_ANALYTICS` | No | `false` | Enable Google Analytics: `true` or `false` |
| `VITE_ENABLE_AI_CHAT` | No | `true` | Enable AI chat widget: `true` or `false` |

---

## AI Agent Environment Variables

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8000` | Port for AI agent service |
| `LOG_LEVEL` | No | `INFO` | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` |

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | No | - | MongoDB connection string |
| `DATABASE_URL` | No | - | PostgreSQL connection string (Supabase) |
| `REDIS_URL` | No | - | Redis connection string |
| `AI_AGENT_REDIS_URL` | No | - | Alternative Redis URL for AI agent |

**Localhost:**
```env
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
DATABASE_URL=postgresql://postgres:password@localhost:5432/kayak
REDIS_URL=redis://localhost:6379
```

### AI/LLM Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic Claude API key |
| `GOOGLE_AI_API_KEY` | No | - | Google AI API key |
| `LLM_PROVIDER` | No | `openai` | LLM provider: `openai`, `anthropic`, `google` |
| `LLM_MODEL` | No | `gpt-4` | Model name: `gpt-4`, `claude-3-opus`, `gemini-pro` |

**Example:**
```env
OPENAI_API_KEY=sk-...
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
```

### LangChain Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LANGCHAIN_TRACING_V2` | No | `false` | Enable LangChain tracing: `true` or `false` |
| `LANGCHAIN_API_KEY` | No | - | LangSmith API key |
| `LANGCHAIN_PROJECT` | No | - | LangSmith project name |

### MCP Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MCP_SERVER_URL` | No | - | Model Context Protocol server URL |
| `MCP_ENABLED` | No | `false` | Enable MCP: `true` or `false` |
| `SUPABASE_MCP_URL` | No | - | Supabase MCP endpoint URL |
| `SUPABASE_ACCESS_TOKEN` | No | - | Supabase access token |

### Service Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKEND_API_URL` | No | `http://localhost:3000` | Backend API URL |
| `CACHE_ENABLED` | No | `false` | Enable caching: `true` or `false` |
| `CACHE_TTL` | No | `3600` | Cache TTL in seconds |

### Search Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_SEARCH_RESULTS` | No | `20` | Maximum search results to return |
| `DEFAULT_SEARCH_LIMIT` | No | `10` | Default search limit |
| `TAVILY_ENABLED` | No | `false` | Enable Tavily search: `true` or `false` |
| `TAVILY_API_KEY` | No | - | Tavily API key |
| `WEATHER_API_KEY` | No | - | Weather API key |

### Development/Debug

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DEBUG` | No | `false` | Enable debug mode: `true` or `false` |
| `VERBOSE_LOGGING` | No | `false` | Enable verbose logging: `true` or `false` |

---

## Localhost vs Cloud Configuration

### Localhost Setup (Development)

**Advantages:**
- ✅ No cloud accounts needed (except Firebase)
- ✅ Free to run
- ✅ Fast development iteration
- ✅ Works offline (except Firebase auth)
- ✅ No data egress costs

**Configuration:**

```env
# Backend
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
CACHE_ENABLED=false
AI_AGENT_URL=http://localhost:8000

# Frontend
VITE_API_URL=http://localhost:3000

# AI Agent
MONGODB_URI=mongodb://root:password@localhost:27017/kayak?authSource=admin
BACKEND_API_URL=http://localhost:3000
```

**Start MongoDB:**
```bash
docker-compose up -d mongodb
```

### Cloud Setup (Production-like)

**Advantages:**
- ✅ Production-like environment
- ✅ Managed backups
- ✅ Scalability
- ✅ High availability
- ✅ Global distribution

**Configuration:**

```env
# Backend
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kayak?retryWrites=true&w=majority
DATABASE_URL=postgresql://postgres:pass@project.supabase.co:5432/postgres
REDIS_URL=redis://default:pass@redis-12345.cloud.redislabs.com:12345
CACHE_ENABLED=true

# Frontend
VITE_API_URL=https://api.yourdomain.com

# AI Agent
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kayak?retryWrites=true&w=majority
DATABASE_URL=postgresql://postgres:pass@project.supabase.co:5432/postgres
REDIS_URL=redis://default:pass@redis-12345.cloud.redislabs.com:12345
```

**Cloud Services:**
- **MongoDB:** [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free M0 tier)
- **PostgreSQL:** [Supabase](https://supabase.com) (Free tier)
- **Redis:** [Redis Cloud](https://redis.com/try-free/) (Free 30MB tier)
- **Firebase:** [Firebase](https://firebase.google.com/) (Free Spark plan)

---

## Environment File Locations

```
project-root/
├── backend/
│   ├── .env                          # Backend environment (create from template)
│   └── env.localhost.template        # Localhost template
│
├── frontend/
│   ├── .env                          # Frontend environment (create from template)
│   └── env.localhost.template        # Localhost template
│
└── ai-agent/
    ├── .env                          # AI agent environment (create from template)
    └── env.localhost.template        # Localhost template
```

---

## Quick Setup Commands

### Localhost Setup (Automated)
```bash
./setup-localhost.sh
```

### Manual Setup
```bash
# Backend
cd backend
cp env.localhost.template .env
node scripts/generate-secrets.js
# Edit .env with Firebase credentials

# Frontend
cd frontend
cp env.localhost.template .env
# Edit .env with Firebase credentials

# AI Agent
cd ai-agent
cp env.localhost.template .env
# Edit .env with AI API keys (optional)

# Start MongoDB
docker-compose up -d mongodb
```

---

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore` for a reason
2. **Use strong secrets** - Generate with `crypto.randomBytes(64).toString('hex')`
3. **Rotate secrets regularly** - Especially in production
4. **Use different secrets per environment** - Dev, staging, production
5. **Store production secrets securely** - Use AWS Secrets Manager, HashiCorp Vault, etc.
6. **Limit access** - Only give access to those who need it
7. **Monitor for leaks** - Use tools like GitGuardian
8. **Use HTTPS in production** - Never send secrets over HTTP

---

## Troubleshooting

### Common Issues

**Problem:** `MONGODB_URI must be set`
**Solution:** Check that `MONGODB_URI` is set in your `.env` file

**Problem:** `JWT_SECRET must be set`
**Solution:** Run `node scripts/generate-secrets.js` and update `.env`

**Problem:** Firebase authentication errors
**Solution:** Verify Firebase credentials in both backend and frontend `.env` files

**Problem:** Cannot connect to MongoDB
**Solution:** Ensure MongoDB is running: `docker ps | grep mongodb`

**Problem:** Port already in use
**Solution:** Change the port in `.env` or kill the process: `lsof -ti:3000 | xargs kill -9`

---

## Additional Resources

- [Localhost Setup Guide](LOCALHOST_SETUP.md)
- [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
- [Database Setup Guide](backend/docs/DATABASE_SETUP.md)
- [Secrets Guide](backend/docs/SECRETS.md)
- [Project Overview](docs/PROJECT_OVERVIEW.md)

---

## Template Files

All template files are available in the project:
- `backend/env.localhost.template`
- `frontend/env.localhost.template`
- `ai-agent/env.localhost.template`

Copy these to `.env` and customize for your environment.

