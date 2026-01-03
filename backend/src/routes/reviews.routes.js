import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as reviewsController from '../controllers/reviews.controller.js';

const router = express.Router();

router.get('/', reviewsController.listReviews);
router.post('/', authenticateToken, reviewsController.createReview);

export default router;
