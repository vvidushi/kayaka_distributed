import { v4 as uuidv4 } from 'uuid';
import { getMongoDB, getPostgresPool } from '../config/database.js';
import { logger } from '../config/logger.js';
import { sendKafkaMessage } from '../config/kafka.js';
import { invalidateListingCache } from '../utils/cache.js';
import { searchPayments } from './payments.service.js';

/**
 * Create flight listing
 */
export const createFlight = async (flightData) => {
  const db = await getMongoDB();
  const flightsCollection = db.collection('flights');

  try {
    const flight = {
      _id: flightData.id || uuidv4(),
      ...flightData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await flightsCollection.insertOne(flight);

    logger.info(`Flight created: ${flight._id}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'flight',
      listingId: flight._id,
      action: 'created',
      data: flight,
    });

    await invalidateListingCache('flight', flight._id);

    return flight;
  } catch (error) {
    logger.error('Error creating flight:', error);
    throw error;
  }
};

/**
 * Update flight listing
 */
export const updateFlight = async (flightId, updateData) => {
  const db = await getMongoDB();
  const flightsCollection = db.collection('flights');

  try {
    const update = {
      ...updateData,
      updatedAt: new Date(),
    };

    const result = await flightsCollection.updateOne(
      { _id: flightId },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      throw new Error('Flight not found');
    }

    logger.info(`Flight updated: ${flightId}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'flight',
      listingId: flightId,
      action: 'updated',
      data: update,
    });

    await invalidateListingCache('flight', flightId);

    return result;
  } catch (error) {
    logger.error('Error updating flight:', error);
    throw error;
  }
};

/**
 * Delete flight listing
 */
export const deleteFlight = async (flightId) => {
  const db = await getMongoDB();
  const flightsCollection = db.collection('flights');

  try {
    const result = await flightsCollection.deleteOne({ _id: flightId });

    if (result.deletedCount === 0) {
      throw new Error('Flight not found');
    }

    logger.info(`Flight deleted: ${flightId}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'flight',
      listingId: flightId,
      action: 'deleted',
    });

    await invalidateListingCache('flight', flightId);

    return result;
  } catch (error) {
    logger.error('Error deleting flight:', error);
    throw error;
  }
};

/**
 * Create hotel listing
 */
export const createHotel = async (hotelData) => {
  const db = await getMongoDB();
  const hotelsCollection = db.collection('hotels');

  try {
    const hotel = {
      _id: hotelData.id || uuidv4(),
      ...hotelData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await hotelsCollection.insertOne(hotel);

    logger.info(`Hotel created: ${hotel._id}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'hotel',
      listingId: hotel._id,
      action: 'created',
      data: hotel,
    });

    await invalidateListingCache('hotel', hotel._id);

    return hotel;
  } catch (error) {
    logger.error('Error creating hotel:', error);
    throw error;
  }
};

/**
 * Update hotel listing
 */
export const updateHotel = async (hotelId, updateData) => {
  const db = await getMongoDB();
  const hotelsCollection = db.collection('hotels');

  try {
    const update = {
      ...updateData,
      updatedAt: new Date(),
    };

    const result = await hotelsCollection.updateOne(
      { _id: hotelId },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      throw new Error('Hotel not found');
    }

    logger.info(`Hotel updated: ${hotelId}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'hotel',
      listingId: hotelId,
      action: 'updated',
      data: update,
    });

    await invalidateListingCache('hotel', hotelId);

    return result;
  } catch (error) {
    logger.error('Error updating hotel:', error);
    throw error;
  }
};

/**
 * Delete hotel listing
 */
export const deleteHotel = async (hotelId) => {
  const db = await getMongoDB();
  const hotelsCollection = db.collection('hotels');

  try {
    const result = await hotelsCollection.deleteOne({ _id: hotelId });

    if (result.deletedCount === 0) {
      throw new Error('Hotel not found');
    }

    logger.info(`Hotel deleted: ${hotelId}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'hotel',
      listingId: hotelId,
      action: 'deleted',
    });

    await invalidateListingCache('hotel', hotelId);

    return result;
  } catch (error) {
    logger.error('Error deleting hotel:', error);
    throw error;
  }
};

/**
 * Create car listing
 */
export const createCar = async (carData) => {
  const db = await getMongoDB();
  const carsCollection = db.collection('cars');

  try {
    const car = {
      _id: carData.id || uuidv4(),
      ...carData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await carsCollection.insertOne(car);

    logger.info(`Car created: ${car._id}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'car',
      listingId: car._id,
      action: 'created',
      data: car,
    });

    await invalidateListingCache('car', car._id);

    return car;
  } catch (error) {
    logger.error('Error creating car:', error);
    throw error;
  }
};

/**
 * Update car listing
 */
export const updateCar = async (carId, updateData) => {
  const db = await getMongoDB();
  const carsCollection = db.collection('cars');

  try {
    const update = {
      ...updateData,
      updatedAt: new Date(),
    };

    const result = await carsCollection.updateOne(
      { _id: carId },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      throw new Error('Car not found');
    }

    logger.info(`Car updated: ${carId}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'car',
      listingId: carId,
      action: 'updated',
      data: update,
    });

    await invalidateListingCache('car', carId);

    return result;
  } catch (error) {
    logger.error('Error updating car:', error);
    throw error;
  }
};

/**
 * Delete car listing
 */
export const deleteCar = async (carId) => {
  const db = await getMongoDB();
  const carsCollection = db.collection('cars');

  try {
    const result = await carsCollection.deleteOne({ _id: carId });

    if (result.deletedCount === 0) {
      throw new Error('Car not found');
    }

    logger.info(`Car deleted: ${carId}`);

    await sendKafkaMessage('inventory.updated', {
      eventId: uuidv4(),
      occurredAt: new Date().toISOString(),
      listingType: 'car',
      listingId: carId,
      action: 'deleted',
    });

    await invalidateListingCache('car', carId);

    return result;
  } catch (error) {
    logger.error('Error deleting car:', error);
    throw error;
  }
};

/**
 * Get revenue report
 */
export const getRevenueReport = async (filters = {}) => {
  const pool = getPostgresPool();

  try {
    const {
      startDate,
      endDate,
      city,
      state,
      provider,
      groupBy = 'month',
    } = filters;

    let query = `
      SELECT 
        DATE_TRUNC($1, b.created_at) as period,
        b.booking_type,
        SUM(b.price_amount) as revenue,
        COUNT(*) as booking_count
      FROM bookings b
      WHERE b.status = 'CONFIRMED'
    `;
    const params = [groupBy];
    let paramIndex = 2;

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

    query += ` GROUP BY period, b.booking_type ORDER BY period DESC`;

    const result = await pool.query(query, params);

    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: result.rows.map((row) => ({
        period: row.period,
        bookingType: row.booking_type,
        revenue: parseFloat(row.revenue),
        bookingCount: parseInt(row.booking_count, 10),
      })),
    };
  } catch (error) {
    logger.error('Error generating revenue report:', error);
    throw error;
  }
};

/**
 * Get top providers report
 * Note: This is a simplified version. In production, provider info would come from listing metadata
 */
export const getTopProviders = async (filters = {}) => {
  const pool = getPostgresPool();

  try {
    const { limit = 10, startDate, endDate } = filters;

    let query = `
      SELECT 
        b.booking_type as provider,
        SUM(b.price_amount) as total_revenue,
        COUNT(*) as booking_count
      FROM bookings b
      WHERE b.status = 'CONFIRMED'
    `;
    const params = [];
    let paramIndex = 1;

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

    query += ` GROUP BY b.booking_type ORDER BY total_revenue DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return {
      generatedAt: new Date().toISOString(),
      providers: result.rows.map((row) => ({
        provider: row.provider,
        totalRevenue: parseFloat(row.total_revenue),
        bookingCount: parseInt(row.booking_count, 10),
      })),
    };
  } catch (error) {
    logger.error('Error generating top providers report:', error);
    throw error;
  }
};

/**
 * Helper to fetch bookings in a date window for analytics
 */
const fetchBookingsForAnalytics = async ({ startDate, endDate, statuses = ['CONFIRMED', 'COMPLETED'] }) => {
  const pool = getPostgresPool();

  let query = `
    SELECT id, user_id, booking_type, status, price_amount, price_currency, itinerary, metadata, created_at
    FROM bookings
    WHERE status = ANY($1::text[])
  `;
  const params = [statuses];
  let idx = 2;

  if (startDate) {
    query += ` AND created_at >= $${idx}`;
    params.push(startDate);
    idx++;
  }
  if (endDate) {
    query += ` AND created_at <= $${idx}`;
    params.push(endDate);
    idx++;
  }

  const result = await pool.query(query, params);

  const parseItinerary = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  return result.rows.map((row) => ({
    id: row.id,
    bookingType: row.booking_type,
    status: row.status,
    amount: row.price_amount ? parseFloat(row.price_amount) : 0,
    currency: row.price_currency || 'USD',
    itinerary: parseItinerary(row.itinerary),
    metadata: row.metadata || {},
    createdAt: row.created_at,
  }));
};

export const getTopPropertiesReport = async ({ year, limit = 10 }) => {
  const startDate = year ? `${year}-01-01` : null;
  const endDate = year ? `${year}-12-31` : null;

  const bookings = await fetchBookingsForAnalytics({ startDate, endDate });

  const aggregate = new Map();

  const makeKey = (b) => {
    if (b.bookingType === 'hotel') {
      return b.itinerary?.hotelId || b.itinerary?.hotelName || 'hotel-unknown';
    }
    if (b.bookingType === 'car') {
      return b.itinerary?.carId || `${b.itinerary?.vendor || 'car-vendor'}-${b.itinerary?.type || ''}`;
    }
    return b.itinerary?.outbound?.id || b.itinerary?.flightId || 'flight-unknown';
  };

  const makeLabel = (b) => {
    if (b.bookingType === 'hotel') {
      return b.itinerary?.hotelName || 'Hotel';
    }
    if (b.bookingType === 'car') {
      return `${b.itinerary?.vendor || 'Car'} ${b.itinerary?.type || ''}`.trim();
    }
    const from = b.itinerary?.outbound?.from || b.itinerary?.from || '';
    const to = b.itinerary?.outbound?.to || b.itinerary?.to || '';
    const airline = b.itinerary?.outbound?.airline || b.itinerary?.airline || 'Flight';
    return `${airline} ${from}-${to}`.trim();
  };

  bookings.forEach((b) => {
    const key = makeKey(b);
    const entry = aggregate.get(key) || { revenue: 0, count: 0, label: makeLabel(b) };
    entry.revenue += b.amount || 0;
    entry.count += 1;
    aggregate.set(key, entry);
  });

  const items = Array.from(aggregate.entries())
    .map(([id, data]) => ({ id, name: data.label, revenue: data.revenue, bookings: data.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    filters: { year, limit },
    items,
  };
};

export const getCityRevenueReport = async ({ year }) => {
  const startDate = year ? `${year}-01-01` : null;
  const endDate = year ? `${year}-12-31` : null;

  const bookings = await fetchBookingsForAnalytics({ startDate, endDate });
  const aggregate = new Map();

  const getCity = (b) => {
    if (b.bookingType === 'hotel') return b.itinerary?.city;
    if (b.bookingType === 'car') return b.itinerary?.city || b.itinerary?.location;
    return b.itinerary?.to || b.itinerary?.arrivalAirport || b.itinerary?.arrivalCity;
  };

  bookings.forEach((b) => {
    const city = getCity(b) || 'Unknown';
    const entry = aggregate.get(city) || { revenue: 0, count: 0 };
    entry.revenue += b.amount || 0;
    entry.count += 1;
    aggregate.set(city, entry);
  });

  const items = Array.from(aggregate.entries()).map(([city, data]) => ({
    city,
    revenue: data.revenue,
    bookings: data.count,
  }));

  return {
    generatedAt: new Date().toISOString(),
    filters: { year },
    items,
  };
};

export const getLastMonthTopProviders = async ({ limit = 10 }) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const bookings = await fetchBookingsForAnalytics({ startDate, endDate });
  const aggregate = new Map();

  const getProvider = (b) => {
    if (b.bookingType === 'hotel') return b.itinerary?.hotelName || 'Hotel';
    if (b.bookingType === 'car') return b.itinerary?.vendor || b.itinerary?.provider || 'Car Provider';
    return b.itinerary?.outbound?.airline || b.itinerary?.airline || 'Airline';
  };

  bookings.forEach((b) => {
    const provider = getProvider(b);
    const entry = aggregate.get(provider) || { revenue: 0, count: 0, bookings: [] };
    entry.revenue += b.amount || 0;
    entry.count += 1;
    aggregate.set(provider, entry);
  });

  const providers = Array.from(aggregate.entries())
    .map(([provider, data]) => ({
      provider,
      totalRevenue: data.revenue,
      bookingCount: data.count,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    filters: { limit, startDate, endDate },
    providers,
  };
};

export const searchBills = async (filters = {}) => {
  return await searchPayments(filters);
};
