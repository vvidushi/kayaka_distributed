import express from 'express';
import { requestId } from '../middleware/requestId.js';
import userRoutes from './users.routes.js';
import listingsRoutes from './listings.routes.js';
import bookingsRoutes from './bookings.routes.js';
import paymentsRoutes from './payments.routes.js';
import adminRoutes from './admin.routes.js';
import conciergeRoutes from './concierge.routes.js';
import aiAgentRoutes from './ai-agent.routes.js';
import analyticsRoutes from './analytics.routes.js';
import imagesRoutes from './images.routes.js';
import authRoutes from './auth.routes.js';
import ownerRoutes from './owner.routes.js';
import profileRoutes from './profile.routes.js';
import reviewsRoutes from './reviews.routes.js';

const router = express.Router();
const API_VERSION = process.env.API_VERSION || 'v1';

router.use(requestId);

router.use(`/${API_VERSION}/auth`, authRoutes);
router.use(`/${API_VERSION}/users`, userRoutes);
router.use(`/${API_VERSION}/listings`, listingsRoutes);
router.use(`/${API_VERSION}/bookings`, bookingsRoutes);
router.use(`/${API_VERSION}/payments`, paymentsRoutes);
router.use(`/${API_VERSION}/admin`, adminRoutes);
router.use(`/${API_VERSION}/concierge`, conciergeRoutes);
router.use(`/${API_VERSION}/ai-agent`, aiAgentRoutes);
router.use(`/${API_VERSION}/analytics`, analyticsRoutes);
router.use(`/${API_VERSION}/images`, imagesRoutes);
router.use(`/${API_VERSION}/owner`, ownerRoutes);
router.use(`/${API_VERSION}/profile`, profileRoutes);
router.use(`/${API_VERSION}/reviews`, reviewsRoutes);

export default router;
