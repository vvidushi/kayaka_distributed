import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as aiAgentController from '../controllers/ai-agent.controller.js';

const router = express.Router();

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = await import('jsonwebtoken');
        const { getJWTSecret } = await import('../config/jwt.js');
        const { getMongoDB } = await import('../config/database.js');
        const { ObjectId } = await import('mongodb');
        
        const decoded = jwt.default.verify(token, getJWTSecret());
        const db = await getMongoDB();
        const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
        if (user) {
          req.user = {
            id: user._id.toString(),
            userId: user._id.toString(),
            email: user.email,
            profileType: user.profileType,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        }
      } catch (err) {
        // Token invalid - continue without user
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Health check (no auth required)
router.get('/health', aiAgentController.healthCheck);

// Chat sessions (create can work without auth, but will inject user context if available)
router.post('/sessions', optionalAuth, aiAgentController.createSession);
router.get('/sessions/:sessionId', optionalAuth, aiAgentController.getSession);
router.post('/sessions/:sessionId/messages', optionalAuth, aiAgentController.sendMessage);

// Bundles
router.get('/bundles', authenticateToken, aiAgentController.getBundles);
router.get('/bundles/:bundleId', aiAgentController.getBundle);

// Watches
router.post('/watches', authenticateToken, aiAgentController.createWatch);
router.get('/watches', authenticateToken, aiAgentController.listWatches);

// Database queries and policy
router.post('/query', authenticateToken, aiAgentController.executeQuery);
router.post('/policy', aiAgentController.getPolicyAnswer);

export default router;

