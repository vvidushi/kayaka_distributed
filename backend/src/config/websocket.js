import { Server } from 'socket.io';
import { logger } from './logger.js';

let io = null;
const userConnections = new Map(); // userId -> Set of socketIds

/**
 * Initialize WebSocket server
 */
export const initializeWebSocket = (httpServer) => {
  if (io) {
    logger.warn('WebSocket server already initialized');
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    // Authenticate and associate user with socket
    socket.on('authenticate', async (data) => {
      try {
        const { userId, token } = data;
        
        if (!userId) {
          socket.emit('error', { message: 'User ID required' });
          return;
        }

        // In production, verify JWT token here
        // For now, we'll trust the userId from client
        
        socket.userId = userId;
        
        // Track user connections
        if (!userConnections.has(userId)) {
          userConnections.set(userId, new Set());
        }
        userConnections.get(userId).add(socket.id);
        
        socket.join(`user:${userId}`);
        socket.emit('authenticated', { userId, socketId: socket.id });
        
        logger.info(`User ${userId} authenticated on socket ${socket.id}`);
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        const userSockets = userConnections.get(socket.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            userConnections.delete(socket.userId);
          }
        }
      }
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  });

  logger.info('WebSocket server initialized');
  return io;
};

/**
 * Get WebSocket server instance
 */
export const getWebSocketServer = () => {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocket first.');
  }
  return io;
};

/**
 * Check if user is connected
 */
export const isUserConnected = (userId) => {
  return userConnections.has(userId) && userConnections.get(userId).size > 0;
};

/**
 * Get active user count
 */
export const getActiveUserCount = () => {
  return userConnections.size;
};

/**
 * Send event to specific user
 */
export const sendToUser = (userId, event, data) => {
  if (!io) {
    logger.warn('WebSocket server not initialized, cannot send event');
    return false;
  }

  if (!isUserConnected(userId)) {
    logger.debug(`User ${userId} not connected, event not sent: ${event}`);
    return false;
  }

  try {
    io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Sent event ${event} to user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error sending event to user ${userId}:`, error);
    return false;
  }
};

/**
 * Broadcast event to all connected users
 */
export const broadcast = (event, data) => {
  if (!io) {
    logger.warn('WebSocket server not initialized, cannot broadcast');
    return false;
  }

  try {
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Broadcasted event ${event} to all users`);
    return true;
  } catch (error) {
    logger.error('Error broadcasting event:', error);
    return false;
  }
};

