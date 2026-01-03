import { v4 as uuidv4 } from 'uuid';
import { getPostgresPool, getMongoDB } from '../config/database.js';
import { logger } from '../config/logger.js';
import { sendKafkaMessage } from '../config/kafka.js';
import { ObjectId } from 'mongodb';

/**
 * Generate a unique PNR (Passenger Name Record)
 * Format: 6 alphanumeric characters (uppercase letters and numbers)
 */
const generatePNR = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
};

const BOOKING_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

const BOOKING_TYPES = {
  FLIGHT: 'flight',
  HOTEL: 'hotel',
  CAR: 'car',
};

const fetchUsersByIds = async (ids = []) => {
  if (!ids.length) return {};
  const db = await getMongoDB();
  const usersCollection = db.collection('users');
  const objectIds = ids
    .map((id) => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (!objectIds.length) return {};

  const users = await usersCollection
    .find({ _id: { $in: objectIds } })
    .project({ email: 1, firstName: 1, lastName: 1 })
    .toArray();

  const map = {};
  users.forEach((u) => {
    map[u._id.toString()] = {
      id: u._id.toString(),
      email: u.email || null,
      firstName: u.firstName || null,
      lastName: u.lastName || null,
    };
  });
  return map;
};

/**
 * Create a new booking with transaction support
 */
export const createBooking = async (userId, bookingData) => {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      bookingType,
      listingId,
      priceAmount,
      priceCurrency = 'USD',
      itinerary,
      metadata: incomingMetadata = {},
    } = bookingData;

    if (!Object.values(BOOKING_TYPES).includes(bookingType)) {
      throw new Error(`Invalid booking type: ${bookingType}`);
    }

    const bookingId = uuidv4();
    
    // Prepare metadata and PNR for flight bookings
    let pnr = null;
    let finalMetadata = { ...incomingMetadata };
    if (bookingType === BOOKING_TYPES.FLIGHT) {
      pnr = generatePNR();
      finalMetadata = { ...finalMetadata, pnr };
      logger.info(`Generated PNR ${pnr} for flight booking ${bookingId}`);
    }

    const bookingResult = await client.query(
      `INSERT INTO bookings (
        id, user_id, booking_type, status, price_amount, price_currency, itinerary, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        bookingId,
        userId,
        bookingType,
        BOOKING_STATUSES.PENDING,
        priceAmount,
        priceCurrency,
        JSON.stringify(itinerary || {}),
        JSON.stringify(finalMetadata),
      ]
    );

    const booking = bookingResult.rows[0];

    await client.query('COMMIT');

    logger.info(`Booking created: ${bookingId} for user: ${userId}`);

    await sendKafkaMessage('bookings.created', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      bookingId: booking.id,
      userId: booking.user_id,
      bookingType: booking.booking_type,
      status: booking.status,
      priceAmount: booking.price_amount,
      priceCurrency: booking.price_currency,
    });

    return {
      id: booking.id,
      userId: booking.user_id,
      bookingType: booking.booking_type,
      status: booking.status,
      price: {
        amount: parseFloat(booking.price_amount),
        currency: booking.price_currency,
      },
      itinerary: booking.itinerary || null,
      metadata: booking.metadata || {},
      pnr: pnr || (booking.metadata?.pnr || null), // Include PNR in response for flight bookings
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating booking:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId) => {
  const pool = getPostgresPool();

  try {
    const result = await pool.query(
      `SELECT b.*
      FROM bookings b
      WHERE b.id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const booking = result.rows[0];
    const usersMap = await fetchUsersByIds([booking.user_id]);
    return {
      id: booking.id,
      userId: booking.user_id,
      user: usersMap[booking.user_id] || null,
      bookingType: booking.booking_type,
      status: booking.status,
      price: {
        amount: parseFloat(booking.price_amount),
        currency: booking.price_currency,
      },
      itinerary: booking.itinerary || null,
      metadata: booking.metadata || {},
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    };
  } catch (error) {
    logger.error('Error getting booking:', error);
    throw error;
  }
};

/**
 * Search bookings with filters
 */
export const searchBookings = async (filters = {}) => {
  const pool = getPostgresPool();

  try {
    const {
      userId,
      status,
      bookingType,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = filters;

    let query = `
      SELECT b.*
      FROM bookings b
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND b.user_id = $${paramIndex}::text`;
      params.push(userId);
      paramIndex++;
    }

    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (bookingType) {
      query += ` AND b.booking_type = $${paramIndex}`;
      params.push(bookingType);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND b.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND b.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const baseQuery = query;
    const queryWithPaging = `${baseQuery} ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const paramsWithPaging = [...params, limit, offset];

    const [result, countResult] = await Promise.all([
      pool.query(queryWithPaging, paramsWithPaging),
      pool.query(`SELECT COUNT(*) AS total FROM (${baseQuery}) as sub`, params),
    ]);
    const totalItems = parseInt(countResult.rows[0].total, 10);

    const userIds = result.rows.map((b) => b.user_id).filter(Boolean);
    const usersMap = await fetchUsersByIds(userIds);

    const bookings = result.rows.map((booking) => ({
      id: booking.id,
      userId: booking.user_id,
      user: usersMap[booking.user_id] || null,
      bookingType: booking.booking_type,
      status: booking.status,
      price: {
        amount: parseFloat(booking.price_amount),
        currency: booking.price_currency,
      },
      itinerary: booking.itinerary || null,
      metadata: booking.metadata || {},
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    }));

    return {
      items: bookings,
      pagination: {
        total: totalItems,
        limit,
        offset,
      },
    };
  } catch (error) {
    logger.error('Error searching bookings:', error);
    throw error;
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId, newStatus, metadata = {}) => {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    if (!Object.values(BOOKING_STATUSES).includes(newStatus)) {
      throw new Error(`Invalid booking status: ${newStatus}`);
    }

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE bookings 
       SET status = $1, updated_at = NOW(), metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
       WHERE id = $3
       RETURNING *`,
      [newStatus, JSON.stringify(metadata), bookingId]
    );

    if (result.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = result.rows[0];

    await client.query('COMMIT');

    logger.info(`Booking ${bookingId} status updated to ${newStatus}`);

    await sendKafkaMessage('bookings.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      bookingId: booking.id,
      userId: booking.user_id,
      oldStatus: booking.status,
      newStatus,
      metadata,
    });

    return {
      id: booking.id,
      userId: booking.user_id,
      bookingType: booking.booking_type,
      status: booking.status,
      price: {
        amount: parseFloat(booking.price_amount),
        currency: booking.price_currency,
      },
      itinerary: booking.itinerary ? (typeof booking.itinerary === 'string' ? JSON.parse(booking.itinerary) : booking.itinerary) : null,
      metadata: booking.metadata ? (typeof booking.metadata === 'string' ? JSON.parse(booking.metadata) : booking.metadata) : {},
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating booking:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Confirm booking
 */
export const confirmBooking = async (bookingId) => {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status !== BOOKING_STATUSES.PENDING) {
    throw new Error(`Cannot confirm booking with status: ${booking.status}`);
  }

  const updatedBooking = await updateBookingStatus(bookingId, BOOKING_STATUSES.CONFIRMED);

  await sendKafkaMessage('bookings.confirmed', {
    eventId: uuidv4(),
    occurredAt: new Date().toISOString(),
    bookingId: updatedBooking.id,
    userId: updatedBooking.userId,
    bookingType: updatedBooking.bookingType,
    price: updatedBooking.price,
  });

  return updatedBooking;
};

/**
 * Check if user is owner of the property/car for a booking
 */
export const checkBookingOwnership = async (bookingId, ownerId) => {
  try {
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return false;
    }

    const db = await getMongoDB();
    const listingId = booking.itinerary?.hotelId || booking.itinerary?.carId;

    if (!listingId) {
      return false;
    }

    // Convert listingId to ObjectId if it's a string
    let listingObjectId;
    try {
      listingObjectId = typeof listingId === 'string' ? new ObjectId(listingId) : listingId;
    } catch {
      return false;
    }

    if (booking.bookingType === 'hotel') {
      const hotelsCollection = db.collection('hotels');
      const hotel = await hotelsCollection.findOne({ _id: listingObjectId, ownerId });
      return !!hotel;
    } else if (booking.bookingType === 'car') {
      const carsCollection = db.collection('cars');
      const car = await carsCollection.findOne({ _id: listingObjectId, ownerId });
      return !!car;
    }

    return false;
  } catch (error) {
    logger.error('Error checking booking ownership:', error);
    return false;
  }
};

/**
 * Cancel booking
 */
export const cancelBooking = async (bookingId) => {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (booking.status === BOOKING_STATUSES.CANCELLED || booking.status === BOOKING_STATUSES.COMPLETED) {
    throw new Error(`Cannot cancel booking with status: ${booking.status}`);
  }

  return await updateBookingStatus(bookingId, BOOKING_STATUSES.CANCELLED, {
    cancelledAt: new Date().toISOString(),
  });
};

const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUSES.PENDING,
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.COMPLETED,
];

const parseItinerary = (itinerary) => {
  if (!itinerary) return null;
  if (typeof itinerary === 'object') return itinerary;
  try {
    return JSON.parse(itinerary);
  } catch {
    return null;
  }
};

const getBookingEndDate = (booking) => {
  const itinerary = parseItinerary(booking.itinerary);
  if (itinerary?.checkOut) return new Date(itinerary.checkOut);
  if (itinerary?.dropoffDate) return new Date(itinerary.dropoffDate);
  if (itinerary?.return?.departDate) return new Date(itinerary.return.departDate);
  if (itinerary?.outbound?.departDate) return new Date(itinerary.outbound.departDate);
  return booking.updated_at || booking.created_at || null;
};

/**
 * Returns bookings that block account deletion:
 * - PENDING or CONFIRMED bookings
 * - COMPLETED bookings whose end date is less than 30 days ago
 */
export const getBlockingBookingsForDeletion = async (userId) => {
  const pool = getPostgresPool();
  const result = await pool.query(
    `SELECT id, status, itinerary, created_at, updated_at
     FROM bookings
     WHERE user_id = $1
       AND status = ANY($2::text[])`,
    [userId, ACTIVE_BOOKING_STATUSES]
  );

  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const blocking = result.rows.filter((booking) => {
    if (booking.status === BOOKING_STATUSES.PENDING || booking.status === BOOKING_STATUSES.CONFIRMED) {
      return true;
    }

    const endDate = getBookingEndDate(booking);
    if (!endDate) {
      return true; // Fail-safe: unknown end date blocks deletion
    }

    const diffMs = now - new Date(endDate);
    return diffMs < THIRTY_DAYS_MS;
  });

  return blocking.map((booking) => ({
    id: booking.id,
    status: booking.status,
    endDate: getBookingEndDate(booking),
  }));
};
