import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import * as userController from '../controllers/users.controller.js';

const router = express.Router();

router.post('/', userController.createUser);

router.get('/', authenticateToken, requireAdmin, userController.listUsers);
router.get('/:userId', authenticateToken, userController.getUser);
router.put('/:userId', authenticateToken, userController.updateUser);
router.delete('/:userId', authenticateToken, userController.deleteUser);
router.patch(
  '/:userId/compliance/ssn',
  authenticateToken,
  userController.updateUserSsn
);
router.get('/:userId/bookings', authenticateToken, userController.getUserBookings);
router.post('/:userId/bookings', authenticateToken, userController.createUserBooking);
router.get('/:userId/reviews', authenticateToken, userController.getUserReviews);
router.patch('/:userId/deactivate', authenticateToken, userController.deactivateUser);
router.patch('/:userId/reactivate', authenticateToken, requireAdmin, userController.reactivateUser);

export default router;
