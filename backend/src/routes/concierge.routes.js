import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as conciergeController from '../controllers/concierge.controller.js';

const router = express.Router();

router.post('/sessions', authenticateToken, conciergeController.createSession);
router.get('/sessions/:sessionId', authenticateToken, conciergeController.getSession);
router.post('/sessions/:sessionId/messages', authenticateToken, conciergeController.sendMessage);
router.get('/sessions/:sessionId/bundles', authenticateToken, conciergeController.getBundles);
router.post('/sessions/:sessionId/watches', authenticateToken, conciergeController.createWatch);
router.delete('/sessions/:sessionId/watches/:watchId', authenticateToken, conciergeController.deleteWatch);

export default router;

