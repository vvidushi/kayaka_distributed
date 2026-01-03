import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';
import * as imageController from '../controllers/images.controller.js';

const router = express.Router();

router.post('/profiles', authenticateToken, uploadMiddleware, imageController.uploadProfileImage);
router.post('/flights', authenticateToken, uploadMiddleware, imageController.uploadFlightImage);
router.post('/hotels', authenticateToken, uploadMiddleware, imageController.uploadHotelImage);
router.post('/cars', authenticateToken, uploadMiddleware, imageController.uploadCarImage);

router.delete('/:imageId', authenticateToken, imageController.deleteImage);
router.delete('/:entityType/:entityId', authenticateToken, imageController.deleteEntityImages);

export default router;
