import { logger } from '../config/logger.js';
import * as paymentsService from '../services/payments.service.js';

export const listPayments = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const filters = {
      userId,
      bookingId: req.query.bookingId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit, 10) || 50,
      offset: parseInt(req.query.offset, 10) || 0,
    };

    const result = await paymentsService.searchPayments(filters);
    res.json(result);
  } catch (error) {
    logger.error('Error listing payments:', error);
    next(error);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }

    const payment = await paymentsService.createPayment(userId, req.body);
    res.status(201).json(payment);
  } catch (error) {
    logger.error('Error creating payment:', error);
    if (error.message.includes('required') || error.message.includes('must be')) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    if (error.message.includes('only be created')) {
      return res.status(403).json({ code: 'FORBIDDEN', message: error.message });
    }
    next(error);
  }
};

export const getPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?.id;

    const payment = await paymentsService.getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Payment not found' });
    }

    if (userId && payment.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    logger.error('Error getting payment:', error);
    next(error);
  }
};

export const processPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const paymentMethodData = req.body || {};

    const payment = await paymentsService.processPayment(paymentId, paymentMethodData);
    res.status(200).json(payment);
  } catch (error) {
    logger.error('Error processing payment:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    if (error.message.includes('Cannot process') || error.message.includes('failed')) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
    }
    next(error);
  }
};

export const refundPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount } = req.body;

    const payment = await paymentsService.refundPayment(paymentId, amount);
    res.status(202).json(payment);
  } catch (error) {
    logger.error('Error refunding payment:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ code: 'NOT_FOUND', message: error.message });
    }
    if (error.message.includes('Cannot refund') || error.message.includes('cannot exceed')) {
      return res.status(400).json({ code: 'BAD_REQUEST', message: error.message });
    }
    next(error);
  }
};

