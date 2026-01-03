import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// User traces - available to all authenticated users
router.get('/traces/users', analyticsController.getUserTraces);

// Host/Provider analytics - available to property owners and admins
router.get('/clicks/per-page', requireRole('admin', 'moderator', 'user'), analyticsController.getClicksPerPage);
router.get('/clicks/properties', requireRole('admin', 'moderator', 'user'), analyticsController.getPropertyClicks);
router.get('/sections/least-seen', requireRole('admin', 'moderator', 'user'), analyticsController.getLeastSeenSections);
router.get('/reviews/properties', requireRole('admin', 'moderator', 'user'), analyticsController.getPropertyReviews);
router.get('/cohorts', requireRole('admin', 'moderator', 'user'), analyticsController.getCohortAnalysis);
router.get('/bidding', requireRole('admin', 'moderator', 'user'), analyticsController.getBiddingTracking);

export default router;

