import { logger } from '../config/logger.js';
import * as bookingsService from '../services/bookings.service.js';

export const searchBookings = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const filters = {
      userId,
      status: req.query.status,
      bookingType: req.query.bookingType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
    };

    const result = await bookingsService.searchBookings(filters);
    res.json(result);
  } catch (error) {
    logger.error('Error searching bookings:', error);
    next(error);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const booking = await bookingsService.createBooking(userId, req.body);
    res.status(201).json(booking);
  } catch (error) {
    logger.error('Error creating booking:', error);
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
    }
    next(error);
  }
};

export const getBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id;

    const booking = await bookingsService.getBookingById(bookingId);

    if (!booking) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Booking not found' });
    }

    if (userId && booking.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    res.json(booking);
  } catch (error) {
    logger.error('Error getting booking:', error);
    next(error);
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { status, metadata } = req.body;

    if (!status) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: 'status is required' });
    }

    const booking = await bookingsService.updateBookingStatus(bookingId, status, metadata);
    res.json(booking);
  } catch (error) {
    logger.error('Error updating booking:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
    }
    next(error);
  }
};

export const confirmBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await bookingsService.confirmBooking(bookingId);
    res.status(202).json(booking);
  } catch (error) {
    logger.error('Error confirming booking:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    if (error.message.includes('Cannot confirm')) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
    }
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.id;

    // Get booking to verify ownership
    const booking = await bookingsService.getBookingById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Booking not found' });
    }

    // Check if user is the booking owner or has admin role
    // For owners, we need to check if the booking is for their property/car
    // This will be handled by checking the listing ownership in the service
    if (userId && booking.userId !== userId && req.user?.role !== 'admin') {
      // Check if user is owner of the property/car
      const isOwner = await bookingsService.checkBookingOwnership(bookingId, userId);
      if (!isOwner) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'You can only cancel your own bookings or bookings for your properties' });
      }
    }

    const cancelledBooking = await bookingsService.cancelBooking(bookingId);
    res.json(cancelledBooking);
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
    }
    next(error);
  }
};

