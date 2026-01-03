import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import * as bookingsController from '../controllers/bookings.controller.js';

const router = express.Router();

router.get('/', authenticateToken, bookingsController.searchBookings);
router.post('/', authenticateToken, bookingsController.createBooking);
router.get('/:bookingId', authenticateToken, bookingsController.getBooking);
router.patch('/:bookingId', authenticateToken, bookingsController.updateBooking);
router.post('/:bookingId/confirm', authenticateToken, bookingsController.confirmBooking);
router.post('/:bookingId/cancel', authenticateToken, bookingsController.cancelBooking);

export default router;

