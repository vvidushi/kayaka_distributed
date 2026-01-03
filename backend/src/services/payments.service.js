import { v4 as uuidv4 } from 'uuid';
import { getPostgresPool } from '../config/database.js';
import { logger } from '../config/logger.js';
import { sendKafkaMessage } from '../config/kafka.js';
import { ensurePaymentsSchema } from '../utils/schemaGuards.js';
import { getBookingById, confirmBooking, cancelBooking } from './bookings.service.js';

const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

/**
 * Dummy payment gateway - accepts any card and always succeeds
 */
const simulatePaymentGateway = async (paymentData) => {
  const { amount, currency } = paymentData;
  
  // Simulate network delay (100-300ms)
  await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
  
  // Always succeed - accept any card
  const transactionReference = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  return {
    success: true,
    transactionReference,
    authorizationCode: `auth_${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
    processedAt: new Date().toISOString(),
  };
};

/**
 * Create a payment with transaction support
 */
export const createPayment = async (userId, paymentData) => {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await ensurePaymentsSchema(client);
    await client.query('BEGIN');

    const {
      bookingId,
      amount,
      currency = 'USD',
      transactionReference,
      idempotencyKey,
      metadata = {},
      paymentMethod,
      invoiceUrl,
    } = paymentData;

    if (!bookingId) {
      throw new Error('bookingId is required');
    }

    if (!amount || amount <= 0) {
      throw new Error('amount must be greater than 0');
    }

    const booking = await getBookingById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Compare userIds (both are MongoDB ObjectIds stored as-is)
    if (booking.userId !== userId) {
      throw new Error('Payment can only be created by booking owner');
    }

    // Check idempotency if key is provided
    if (idempotencyKey) {
      const existingPayment = await client.query(
        'SELECT * FROM payments WHERE idempotency_key = $1',
        [idempotencyKey]
      );

      if (existingPayment.rows.length > 0) {
        await client.query('COMMIT');
        logger.info(`Idempotent payment request: ${idempotencyKey}`);
        return mapPaymentForResponse(existingPayment.rows[0]);
      }
    }

    const paymentId = uuidv4();

    // Insert payment - user_id is TEXT type (MongoDB ObjectId)
    const mergedMetadata = {
      ...metadata,
      ...(paymentMethod ? { paymentMethod } : {}),
    };

    const paymentResult = await client.query(
      `INSERT INTO payments (
        id, booking_id, user_id, status, amount, currency, transaction_reference, idempotency_key, metadata, created_at, updated_at, invoice_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
      RETURNING *`,
      [
        paymentId,
        bookingId,
        userId,
        PAYMENT_STATUSES.PENDING,
        amount,
        currency,
        transactionReference || null,
        idempotencyKey || null,
        JSON.stringify(mergedMetadata),
        invoiceUrl || null,
      ]
    );

    const payment = paymentResult.rows[0];

    await client.query('COMMIT');

    logger.info(`Payment created: ${paymentId} for booking: ${bookingId}`);

    await sendKafkaMessage('payments.created', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      paymentId: payment.id,
      bookingId: payment.booking_id,
      userId: payment.user_id,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      status: payment.status,
    });

    return mapPaymentForResponse(payment);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating payment:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (paymentId) => {
  const pool = getPostgresPool();

  try {
    const result = await pool.query(
      `SELECT p.*, 
        json_build_object(
          'id', b.id,
          'bookingType', b.booking_type,
          'status', b.status
        ) as booking
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapPaymentForResponse(result.rows[0]);
  } catch (error) {
    logger.error('Error getting payment:', error);
    throw error;
  }
};

/**
 * Search payments with filters
 */
export const searchPayments = async (filters = {}) => {
  const pool = getPostgresPool();

  try {
    const {
      userId,
      bookingId,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters;

    let query = `
      SELECT p.*, 
        json_build_object(
          'id', b.id,
          'bookingType', b.booking_type,
          'status', b.status
        ) as booking
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (userId) {
      // user_id is stored as TEXT (MongoDB ObjectId)
      query += ` AND p.user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (bookingId) {
      query += ` AND p.booking_id = $${paramIndex}`;
      params.push(bookingId);
      paramIndex++;
    }

    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND p.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND p.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Build count query with same filters but without LIMIT/OFFSET
    let countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (userId) {
      countQuery += ` AND p.user_id = $${countParamIndex}`;
      countParams.push(userId);
      countParamIndex++;
    }

    if (bookingId) {
      countQuery += ` AND p.booking_id = $${countParamIndex}`;
      countParams.push(bookingId);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND p.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (startDate) {
      countQuery += ` AND p.created_at >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }

    if (endDate) {
      countQuery += ` AND p.created_at <= $${countParamIndex}`;
      countParams.push(endDate);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);

    const payments = result.rows.map(mapPaymentForResponse);

    return {
      items: payments,
      pagination: {
        total: parseInt(countResult.rows[0].total, 10),
        limit,
        offset,
      },
    };
  } catch (error) {
    logger.error('Error searching payments:', error);
    throw error;
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (paymentId, newStatus, transactionReference = null) => {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    if (!Object.values(PAYMENT_STATUSES).includes(newStatus)) {
      throw new Error(`Invalid payment status: ${newStatus}`);
    }

    await client.query('BEGIN');

    const updateFields = ['status = $1', 'updated_at = NOW()'];
    const params = [newStatus, paymentId];
    let paramIndex = 2;

    if (transactionReference) {
      updateFields.push(`transaction_reference = $${paramIndex}`);
      params.splice(1, 0, transactionReference);
      paramIndex++;
    }

    const result = await client.query(
      `UPDATE payments 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = result.rows[0];

    await client.query('COMMIT');

    logger.info(`Payment ${paymentId} status updated to ${newStatus}`);

    if (newStatus === PAYMENT_STATUSES.SUCCEEDED) {
      await sendKafkaMessage('payments.succeeded', {
        eventId: uuidv4(),
        occurredAt: new Date().toISOString(),
        paymentId: payment.id,
        bookingId: payment.booking_id,
        userId: payment.user_id,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
      });
    }

    return mapPaymentForResponse(payment);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating payment:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Process payment (authorize and capture) - dummy payment gateway always succeeds
 * Auto-confirms booking when payment succeeds
 */
export const processPayment = async (paymentId, paymentMethodData = {}) => {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const payment = await getPaymentById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PAYMENT_STATUSES.PENDING) {
      throw new Error(`Cannot process payment with status: ${payment.status}`);
    }

    // Dummy payment gateway - accepts any card, always succeeds
    const gatewayResponse = await simulatePaymentGateway({
      amount: payment.amount,
      currency: payment.currency,
      metadata: payment.metadata,
      ...paymentMethodData, // Accept any card data without validation
    });

    // Payment always succeeds - update to SUCCEEDED
    const succeeded = await updatePaymentStatus(
      paymentId,
      PAYMENT_STATUSES.SUCCEEDED,
      gatewayResponse.transactionReference
    );

    // Auto-confirm booking when payment succeeds
    try {
      await confirmBooking(payment.bookingId);
      logger.info(`Booking ${payment.bookingId} auto-confirmed after successful payment`);
    } catch (bookingError) {
      logger.warn(`Failed to auto-confirm booking ${payment.bookingId}:`, bookingError);
      // Don't fail payment if booking confirmation fails
    }

    await client.query('COMMIT');

    logger.info(`Payment ${paymentId} processed successfully: ${gatewayResponse.transactionReference}`);

    return succeeded;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error processing payment:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Refund payment - dummy refund always succeeds, also cancels the booking
 */
export const refundPayment = async (paymentId, refundAmount = null) => {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const payment = await getPaymentById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PAYMENT_STATUSES.SUCCEEDED) {
      throw new Error(`Cannot refund payment with status: ${payment.status}`);
    }

    const refundAmountValue = refundAmount || payment.amount;

    if (refundAmountValue > payment.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }

    // Dummy refund - always succeeds
    const result = await client.query(
      `UPDATE payments 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [PAYMENT_STATUSES.REFUNDED, paymentId]
    );

    const refundedPayment = result.rows[0];

    // Cancel the associated booking
    try {
      await cancelBooking(payment.bookingId);
      logger.info(`Booking ${payment.bookingId} cancelled after payment refund`);
    } catch (bookingError) {
      logger.warn(`Failed to cancel booking ${payment.bookingId} after refund:`, bookingError);
      // Continue with refund even if booking cancellation fails
    }

    await client.query('COMMIT');

    logger.info(`Payment ${paymentId} refunded: ${refundAmountValue}`);

    await sendKafkaMessage('payments.refunded', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      paymentId: refundedPayment.id,
      bookingId: refundedPayment.booking_id,
      userId: refundedPayment.user_id,
      refundAmount: refundAmountValue,
      originalAmount: parseFloat(refundedPayment.amount),
      currency: refundedPayment.currency,
    });

    return mapPaymentForResponse(refundedPayment);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error refunding payment:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Map payment database row to response format
 */
const mapPaymentForResponse = (payment) => {
  // Handle metadata - could be JSON string or already parsed object
  let metadata = {};
  if (payment.metadata) {
    if (typeof payment.metadata === 'string') {
      try {
        metadata = JSON.parse(payment.metadata);
      } catch {
        metadata = {};
      }
    } else {
      metadata = payment.metadata;
    }
  }

  // Handle booking - could be JSON string or already parsed object
  let booking = null;
  if (payment.booking) {
    if (typeof payment.booking === 'string') {
      try {
        booking = JSON.parse(payment.booking);
      } catch {
        booking = null;
      }
    } else {
      booking = payment.booking;
    }
  }

  return {
    id: payment.id,
    bookingId: payment.booking_id,
    userId: payment.user_id,
    booking,
    status: payment.status,
    amount: parseFloat(payment.amount),
    currency: payment.currency,
    transactionReference: payment.transaction_reference,
    invoiceUrl: payment.invoice_url,
    paymentMethod: metadata?.paymentMethod || null,
    metadata,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
  };
};
