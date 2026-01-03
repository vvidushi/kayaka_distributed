// CRITICAL: Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'node:fs';

console.log('Starting backend server...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root (one level up from src)
// In Docker, .env file may not exist - environment variables are provided via env_file
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('Loaded .env file from:', envPath);
} else {
  // In Docker/production, rely on environment variables from container
  dotenv.config(); // This will use process.env without file
  console.log('Using environment variables from container (no .env file found)');
}

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import session from 'express-session';
import rateLimit from 'express-rate-limit';

import { logger } from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { initializeFirebase } from './config/firebase.js';
import { getKafkaClient } from './config/kafka.js';
import apiRoutes from './routes/index.js';
import { metricsMiddleware, metricsHandler } from './monitoring/metrics.js';

try {
  initializeFirebase();
} catch (error) {
  console.error('Failed to initialize Firebase:', error.message);
  logger.error('Failed to initialize Firebase:', error);
  // Firebase is optional, don't exit
  console.log('Server starting without Firebase (image uploads will not work)');
}

// Initialize WebSocket server
try {
  const { initializeWebSocket } = await import('./config/websocket.js');
  initializeWebSocket(server);
  logger.info('WebSocket server initialized');
} catch (error) {
  logger.warn('Failed to initialize WebSocket server:', error);
  // WebSocket is optional, continue without it
}

// Initialize Kafka (optional, won't fail if not configured)
// Run asynchronously so it doesn't block server startup
(async () => {
  try {
    const kafkaClient = getKafkaClient();
    if (kafkaClient) {
      logger.info('Kafka client initialized successfully');
      
      // Start Kafka consumers
      try {
        const { startAllConsumers } = await import('./consumers/kafka.consumers.js');
        await startAllConsumers();
      } catch (consumerError) {
        logger.error('Failed to start Kafka consumers:', consumerError);
      }
    } else {
      logger.warn('Kafka not configured. Event streaming features will be disabled.');
    }
  } catch (error) {
    console.error('Failed to initialize Kafka:', error.message);
    logger.error('Failed to initialize Kafka:', error);
    // Kafka is optional, don't exit
    console.log('Server starting without Kafka (event streaming will not work)');
  }
})();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
    if (
      ALLOWED_ORIGINS.includes('*') ||
      ALLOWED_ORIGINS.includes(origin) ||
      (NODE_ENV === 'development' && isLocalhost)
    ) {
      return callback(null, true);
    }

    logger.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(compression());

// Metrics middleware (placed after basic middleware, before routes)
app.use(metricsMiddleware);

// Redis session store - initialize asynchronously without blocking
let sessionStore = null;
(async () => {
  try {
    const { createRedisStore } = await import('./config/sessionStore.js');
    sessionStore = createRedisStore();
    logger.info('Redis session store initialized');
  } catch (error) {
    logger.warn('Failed to initialize Redis session store, using memory store:', error.message);
  }
})();

app.use(session({
  store: sessionStore || undefined,
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000
  }
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 10000, // 10000 requests per 15 min in dev, 100 in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
  res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Prometheus metrics endpoint
app.get('/metrics', metricsHandler);

app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logger.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  process.exit(1);
});

try {
  server.listen(PORT, () => {
    console.log(`Server started successfully on port ${PORT}`);
    logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health/live`);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Please stop the other process or use a different port.`);
      logger.error(`To find and kill the process: lsof -ti:${PORT} | xargs kill -9`);
    } else {
      logger.error('Server error:', error);
    }
    process.exit(1);
  });
} catch (error) {
  console.error('Failed to start server:', error);
  logger.error('Failed to start server:', error);
  process.exit(1);
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  const { closeKafkaConnections } = await import('./config/kafka.js');
  await closeKafkaConnections();
  const { closeConnections } = await import('./config/database.js');
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  const { closeKafkaConnections } = await import('./config/kafka.js');
  await closeKafkaConnections();
  const { closeConnections } = await import('./config/database.js');
  await closeConnections();
  process.exit(0);
});

export default app;
