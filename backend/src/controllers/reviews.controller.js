import { logger } from '../config/logger.js';
import * as reviewsService from '../services/reviews.service.js';

export const createReview = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const { listingType, listingId, rating, title, body } = req.body || {};

    if (!listingType || !listingId || !rating) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'listingType, listingId, and rating are required',
      });
    }

    const numericRating = parseInt(rating, 10);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'rating must be between 1 and 5',
      });
    }

    const review = await reviewsService.createReview({
      userId,
      listingType,
      listingId,
      rating: numericRating,
      title,
      body,
    });

    res.status(201).json(review);
  } catch (error) {
    logger.error('Error creating review:', error);
    next(error);
  }
};

export const listReviews = async (req, res, next) => {
  try {
    const reviews = await reviewsService.listReviews({
      listingType: req.query.listingType,
      listingId: req.query.listingId,
      userId: req.query.userId,
      page: req.query.page,
      pageSize: req.query.pageSize,
    });
    res.json(reviews);
  } catch (error) {
    logger.error('Error listing reviews:', error);
    next(error);
  }
};
