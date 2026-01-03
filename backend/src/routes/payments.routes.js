import express from 'express';
import { body, query, param } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as paymentsController from '../controllers/payments.controller.js';
import { validatePaymentAmount, validateCurrency, validateUUID, validateDateRange, validatePagination } from '../utils/validators.js';

const router = express.Router();

// List payments
router.get(
  '/',
  authenticateToken,
  [
    validateUUID('userId').optional(),
    validateUUID('bookingId').optional(),
    query('status')
      .optional()
      .isIn(['PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED', 'REFUNDED'])
      .withMessage('Invalid payment status'),
    ...validateDateRange(),
    ...validatePagination(),
  ],
  validate,
  paymentsController.listPayments
);

// Create payment
router.post(
  '/',
  authenticateToken,
  [
    body('bookingId')
      .notEmpty()
      .withMessage('bookingId is required')
      .custom((value) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
      })
      .withMessage('Invalid bookingId format'),
    validatePaymentAmount(),
    validateCurrency(),
    body('idempotencyKey')
      .optional()
      .isString()
      .withMessage('Idempotency key must be a string'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),
  ],
  validate,
  paymentsController.createPayment
);

// Get payment by ID
router.get(
  '/:paymentId',
  authenticateToken,
  [validateUUID('paymentId')],
  validate,
  paymentsController.getPayment
);

// Process payment
router.post(
  '/:paymentId/process',
  authenticateToken,
  [
    validateUUID('paymentId'),
    body('paymentMethod')
      .optional()
      .isString()
      .withMessage('Payment method must be a string'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),
  ],
  validate,
  paymentsController.processPayment
);

// Refund payment
router.post(
  '/:paymentId/refunds',
  authenticateToken,
  [
    validateUUID('paymentId'),
    body('amount')
      .optional({ nullable: true, checkFalsy: true })
      .isFloat({ min: 0.01 })
      .withMessage('Refund amount must be greater than 0'),
  ],
  validate,
  paymentsController.refundPayment
);

export default router;

