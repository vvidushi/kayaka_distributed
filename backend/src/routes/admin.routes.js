import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { requirePropertyCompliance } from '../middleware/compliance.js';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.post('/flights', requirePropertyCompliance, adminController.createFlight);
router.put('/flights/:flightId', requirePropertyCompliance, adminController.updateFlight);
router.delete('/flights/:flightId', requirePropertyCompliance, adminController.deleteFlight);

router.post('/hotels', requirePropertyCompliance, adminController.createHotel);
router.put('/hotels/:hotelId', requirePropertyCompliance, adminController.updateHotel);
router.delete('/hotels/:hotelId', requirePropertyCompliance, adminController.deleteHotel);

router.post('/cars', requirePropertyCompliance, adminController.createCar);
router.put('/cars/:carId', requirePropertyCompliance, adminController.updateCar);
router.delete('/cars/:carId', requirePropertyCompliance, adminController.deleteCar);

router.patch('/users/:userId', adminController.modifyUser);

router.get('/reports/revenue', adminController.getRevenueReport);
router.get('/reports/providers', adminController.getTopProviders);
router.get('/reports/top-properties', adminController.getTopProperties);
router.get('/reports/city-revenue', adminController.getCityRevenue);
router.get('/reports/providers/last-month', adminController.getProvidersLastMonth);
router.get('/bills', adminController.searchBills);

export default router;
