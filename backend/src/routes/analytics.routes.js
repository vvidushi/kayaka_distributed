import express from 'express';
import { authenticateToken, requireRole, requireOwner } from '../middleware/auth.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Analytics routes - only for property owners and admins
// Regular travelers should NOT have access to analytics
const ownerOrAdmin = (req, res, next) => {
  const isOwner = req.user?.profileType === 'owner' || req.user?.profileType === 'property_owner';
  const isAdmin = req.user?.role === 'admin';
  
  if (isOwner || isAdmin) {
    return next();
  }
  
  return res.status(403).json({
    code: 'FORBIDDEN',
    message: 'Analytics is only available for property owners. Please upgrade to an owner account to access analytics.'
  });
};

router.use(ownerOrAdmin);

// User traces
router.get('/traces/users', analyticsController.getUserTraces);

// Property analytics
router.get('/clicks/per-page', analyticsController.getClicksPerPage);
router.get('/clicks/properties', analyticsController.getPropertyClicks);
router.get('/sections/least-seen', analyticsController.getLeastSeenSections);
router.get('/reviews/properties', analyticsController.getPropertyReviews);
router.get('/cohorts', analyticsController.getCohortAnalysis);
router.get('/bidding', analyticsController.getBiddingTracking);

export default router;

