import { logger } from '../config/logger.js';
import * as adminService from '../services/admin.service.js';
import { updateUserProfile } from '../services/auth.service.js';

export const createFlight = async (req, res, next) => {
  try {
    const flight = await adminService.createFlight(req.body);
    res.status(201).json(flight);
  } catch (error) {
    logger.error('Error creating flight:', error);
    next(error);
  }
};

export const updateFlight = async (req, res, next) => {
  try {
    const { flightId } = req.params;
    await adminService.updateFlight(flightId, req.body);
    res.json({ id: flightId, ...req.body });
  } catch (error) {
    logger.error('Error updating flight:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    next(error);
  }
};

export const deleteFlight = async (req, res, next) => {
  try {
    const { flightId } = req.params;
    await adminService.deleteFlight(flightId);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting flight:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    next(error);
  }
};

export const createHotel = async (req, res, next) => {
  try {
    const hotel = await adminService.createHotel(req.body);
    res.status(201).json(hotel);
  } catch (error) {
    logger.error('Error creating hotel:', error);
    next(error);
  }
};

export const updateHotel = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    await adminService.updateHotel(hotelId, req.body);
    res.json({ id: hotelId, ...req.body });
  } catch (error) {
    logger.error('Error updating hotel:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    next(error);
  }
};

export const deleteHotel = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    await adminService.deleteHotel(hotelId);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting hotel:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    next(error);
  }
};

export const createCar = async (req, res, next) => {
  try {
    const car = await adminService.createCar(req.body);
    res.status(201).json(car);
  } catch (error) {
    logger.error('Error creating car:', error);
    next(error);
  }
};

export const updateCar = async (req, res, next) => {
  try {
    const { carId } = req.params;
    await adminService.updateCar(carId, req.body);
    res.json({ id: carId, ...req.body });
  } catch (error) {
    logger.error('Error updating car:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    next(error);
  }
};

export const deleteCar = async (req, res, next) => {
  try {
    const { carId } = req.params;
    await adminService.deleteCar(carId);
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting car:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    next(error);
  }
};

export const modifyUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const updatedUser = await updateUserProfile(userId, updates);
    res.json(updatedUser);
  } catch (error) {
    logger.error('Error modifying user:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    next(error);
  }
};

export const getRevenueReport = async (req, res, next) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      city: req.query.city,
      state: req.query.state,
      provider: req.query.provider,
      groupBy: req.query.groupBy || 'month',
    };

    const report = await adminService.getRevenueReport(filters);
    res.json(report);
  } catch (error) {
    logger.error('Error getting revenue report:', error);
    next(error);
  }
};

export const getTopProviders = async (req, res, next) => {
  try {
    const filters = {
      limit: parseInt(req.query.limit, 10) || 10,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const report = await adminService.getTopProviders(filters);
    res.json(report);
  } catch (error) {
    logger.error('Error getting top providers:', error);
    next(error);
  }
};

export const getTopProperties = async (req, res, next) => {
  try {
    const report = await adminService.getTopPropertiesReport({
      year: req.query.year,
      limit: parseInt(req.query.limit, 10) || 10,
    });
    res.json(report);
  } catch (error) {
    logger.error('Error getting top properties report:', error);
    next(error);
  }
};

export const getCityRevenue = async (req, res, next) => {
  try {
    const report = await adminService.getCityRevenueReport({
      year: req.query.year,
    });
    res.json(report);
  } catch (error) {
    logger.error('Error getting city revenue report:', error);
    next(error);
  }
};

export const getProvidersLastMonth = async (req, res, next) => {
  try {
    const report = await adminService.getLastMonthTopProviders({
      limit: parseInt(req.query.limit, 10) || 10,
    });
    res.json(report);
  } catch (error) {
    logger.error('Error getting providers last month report:', error);
    next(error);
  }
};

export const searchBills = async (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;
    const { month } = req.query;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      if (y && m) {
        startDate = new Date(y, m - 1, 1).toISOString();
        endDate = new Date(y, m, 0, 23, 59, 59).toISOString();
      }
    }

    const result = await adminService.searchBills({
      userId: req.query.userId,
      bookingId: req.query.bookingId,
      status: req.query.status,
      startDate,
      endDate,
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
    });
    res.json(result);
  } catch (error) {
    logger.error('Error searching bills:', error);
    next(error);
  }
};
