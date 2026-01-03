import { logger } from '../config/logger.js';
import { getPostgresPool, getMongoDB } from '../config/database.js';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { PROFILE_TYPES } from '../constants/profileTypes.js';
import { isValidSsn } from '../utils/validators.js';
import {
  normalizeProfileType,
  normalizePartnerDetails,
} from '../utils/profile.js';
import {
  getCachedUserProfile,
  cacheUserProfile,
  invalidateUserProfileCache,
} from '../utils/cache.js';

const isUsersTableMissing = (error) =>
  error?.code === '42P01' || error?.message?.includes('relation "users" does not exist');

const POSTGRES_UNAVAILABLE_CODES = new Set([
  '57P01', // admin shutdown
  '57P02', // crash shutdown
  '57P03', // cannot connect now
  '57P04', // database dropped
  '08000', // connection exception
  '08003', // connection does not exist
  '08006', // connection failure
  '08001', // SQL client unable to establish SQL connection
  '08004', // SQL server rejected establishment of SQL connection
  '08007', // transaction resolution unknown
  '08P01', // protocol violation
  'XX000', // internal error (e.g. db termination)
]);

const isPostgresUnavailable = (error) => {
  if (!error) {
    return false;
  }

  if (error.code && POSTGRES_UNAVAILABLE_CODES.has(error.code)) {
    return true;
  }

  const message = error.message?.toLowerCase?.();
  return message ? message.includes('db_termination') : false;
};

const syncMongoUser = async (userId, updates) => {
  if (!updates || Object.keys(updates).length === 0) {
    return;
  }

  try {
    const db = await getMongoDB();
    const usersCollection = db.collection('users');
    await usersCollection.updateOne({ _id: new ObjectId(userId) }, { $set: updates, $currentDate: { updatedAt: true } });
    logger.info(`Synced user update to MongoDB: ${userId}`);
  } catch (mongoError) {
    logger.warn(`Failed to sync user update to MongoDB: ${mongoError.message}`);
  }
};

export const listUsers = async (filters) => {
  const pool = getPostgresPool();
  const { page, pageSize, email, state } = filters;
  const offset = (page - 1) * pageSize;

  let query = `SELECT id, ssn, first_name, last_name, email, phone_number,
    address_line1, address_line2, address_city, address_state, address_zip_code,
    profile_image_url, role, loyalty_tier, profile_type, ssn_verified_at,
    partner_details, created_at, updated_at, last_login
    FROM users WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (email) {
    query += ` AND email = $${paramIndex++}`;
    params.push(email);
  }

  if (state) {
    query += ` AND address_state = $${paramIndex++}`;
    params.push(state);
  }

  query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(pageSize, offset);

  const usersResult = await pool.query(query, params);
  const users = usersResult.rows;

  let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
  const countParams = [];
  let countParamIndex = 1;
  if (email) {
    countQuery += ` AND email = $${countParamIndex++}`;
    countParams.push(email);
  }
  if (state) {
    countQuery += ` AND address_state = $${countParamIndex++}`;
    countParams.push(state);
  }
  const countResult = await pool.query(countQuery, countParams);
  const totalItems = parseInt(countResult.rows[0].total);
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    items: users,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages
    }
  };
};

export const createUser = async (userData) => {
  const pool = getPostgresPool();
  // Use provided userId (MongoDB ObjectId) or generate UUID for backward compatibility
  const userId = userData.userId || uuidv4();

  const {
    ssn,
    firstName,
    lastName,
    email,
    phoneNumber,
    address,
    profileImageUrl,
    profileType = PROFILE_TYPES.TRAVELER,
    partnerDetails: partnerProfile = null,
  } = userData;

  if (ssn && !isValidSsn(ssn)) {
    const error = new Error('SSN must match XXX-XX-XXXX');
    error.code = 'INVALID_SSN';
    throw error;
  }

  const normalizedProfileType = normalizeProfileType(profileType);
  const partnerDetails = normalizePartnerDetails(normalizedProfileType, partnerProfile);
  const partnerDetailsValue = partnerDetails ? JSON.stringify(partnerDetails) : null;

  const query = `
    INSERT INTO users (
      id, ssn, first_name, last_name, email, phone_number,
      address_line1, address_line2, address_city, address_state, address_zip_code,
      profile_image_url, profile_type, ssn_verified_at, partner_details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  `;

  const params = [
    userId,
    ssn || null,
    firstName,
    lastName,
    email,
    phoneNumber,
    address.line1,
    address.line2 || null,
    address.city,
    address.state,
    address.zipCode,
    profileImageUrl || null,
    normalizedProfileType,
    ssn ? new Date() : null,
    partnerDetailsValue,
  ];

  await pool.query(query, params);

  return getUserById(userId);
};

export const getUserById = async (userId) => {
  // Try to get cached user profile
  const cached = await getCachedUserProfile(userId);
  if (cached) {
    logger.debug(`Returning cached user profile: ${userId}`);
    return cached;
  }

  // Try PostgreSQL first
  const pool = getPostgresPool();
  let user = null;
  try {
    const result = await pool.query(
      `SELECT id, ssn, first_name, last_name, email, phone_number,
       address_line1, address_line2, address_city, address_state, address_zip_code,
       profile_image_url, role, loyalty_tier, profile_type, ssn_verified_at,
       partner_details, created_at, updated_at, last_login
       FROM users WHERE id = $1`,
      [userId]
    );

    user = result.rows[0] ? { ...result.rows[0], data_source: 'postgres' } : null;
  } catch (error) {
    if (isUsersTableMissing(error) || isPostgresUnavailable(error)) {
      logger.warn(
        `PostgreSQL unavailable for user ${userId}, falling back to MongoDB: ${error.message}`
      );
    } else {
      throw error;
    }
  }

  // If not found in PostgreSQL, fall back to MongoDB
  if (!user) {
    try {
      const db = await getMongoDB();
      const usersCollection = db.collection('users');
      
      // Try to find user by ObjectId first
      let mongoUser = null;
      try {
        mongoUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
      } catch (objectIdError) {
        // If ObjectId conversion fails, userId might be a UUID or other format
        // Try to find by email or other identifier if needed
        logger.debug(`ObjectId conversion failed for userId ${userId}, trying alternative lookup`);
      }
      
      // If ObjectId lookup failed, try finding by email (if userId happens to be an email)
      // This is a fallback for edge cases
      if (!mongoUser && userId.includes('@')) {
        mongoUser = await usersCollection.findOne({ email: userId });
      }
      
      if (mongoUser) {
        // Map MongoDB user to PostgreSQL format
        // Ensure all fields have proper defaults to avoid undefined values
        user = {
          id: mongoUser._id.toString(),
          ssn: mongoUser.ssn || null,
          first_name: mongoUser.firstName || null,
          last_name: mongoUser.lastName || null,
          email: mongoUser.email || null,
          phone_number: mongoUser.phoneNumber || null,
          address_line1: mongoUser.address?.line1 || null,
          address_line2: mongoUser.address?.line2 || null,
          address_city: mongoUser.address?.city || null,
          address_state: mongoUser.address?.state || null,
          address_zip_code: mongoUser.address?.zipCode || null,
          profile_image_url: mongoUser.profileImageUrl || null,
          role: mongoUser.role || 'user',
          loyalty_tier: mongoUser.loyaltyTier || 'none',
          profile_type: normalizeProfileType(mongoUser.profileType),
          ssn_verified_at: mongoUser.ssnVerifiedAt || null,
          partner_details: mongoUser.partnerProfile || mongoUser.partnerDetails || null,
          created_at: mongoUser.createdAt || null,
          updated_at: mongoUser.updatedAt || null,
          last_login: mongoUser.lastLogin || null,
          data_source: 'mongo',
        };
        
        logger.debug(`Found user in MongoDB: ${mongoUser.email}, firstName: ${user.first_name}, lastName: ${user.last_name}`);
      }
    } catch (error) {
      logger.warn(`Failed to fetch user from MongoDB: ${error.message}`);
    }
  }

  if (user) {
    // Cache the user profile
    await cacheUserProfile(userId, user);
  }

  return user;
};

export const updateUserSsn = async (userId, ssn) => {
  if (!ssn) {
    const error = new Error('SSN is required');
    error.code = 'INVALID_SSN';
    throw error;
  }

  if (!isValidSsn(ssn)) {
    const error = new Error('SSN must match XXX-XX-XXXX');
    error.code = 'INVALID_SSN';
    throw error;
  }

  const pool = getPostgresPool();
  const result = await pool.query(
    `UPDATE users
     SET ssn = $2,
         ssn_verified_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, first_name, last_name, role, loyalty_tier,
       profile_type, ssn, ssn_verified_at` ,
    [userId, ssn]
  );

  if (result.rowCount === 0) {
    const error = new Error('User not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Invalidate user profile cache
  await invalidateUserProfileCache(userId);

  return result.rows[0];
};

export const updateUser = async (userId, userData) => {
  const pool = getPostgresPool();
  logger.info(`Updating user ${userId}`);
  
  const {
    firstName,
    lastName,
    phoneNumber,
    address,
    profileImageUrl,
  } = userData;

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (firstName !== undefined) {
    updates.push(`first_name = $${paramIndex++}`);
    params.push(firstName);
  }

  if (lastName !== undefined) {
    updates.push(`last_name = $${paramIndex++}`);
    params.push(lastName);
  }

  if (phoneNumber !== undefined) {
    updates.push(`phone_number = $${paramIndex++}`);
    params.push(phoneNumber);
  }

  if (address?.line1 !== undefined) {
    updates.push(`address_line1 = $${paramIndex++}`);
    params.push(address.line1);
  }

  if (address?.line2 !== undefined) {
    updates.push(`address_line2 = $${paramIndex++}`);
    params.push(address.line2 || null);
  }

  if (address?.city !== undefined) {
    updates.push(`address_city = $${paramIndex++}`);
    params.push(address.city);
  }

  if (address?.state !== undefined) {
    updates.push(`address_state = $${paramIndex++}`);
    params.push(address.state);
  }

  if (address?.zipCode !== undefined) {
    updates.push(`address_zip_code = $${paramIndex++}`);
    params.push(address.zipCode);
  }

  if (profileImageUrl !== undefined) {
    updates.push(`profile_image_url = $${paramIndex++}`);
    params.push(profileImageUrl);
  }

  if (updates.length === 0) {
    // No updates to make, just return current user
    return getUserById(userId);
  }

  const mongoUpdates = {};
  if (firstName !== undefined) mongoUpdates.firstName = firstName;
  if (lastName !== undefined) mongoUpdates.lastName = lastName;
  if (phoneNumber !== undefined) mongoUpdates.phoneNumber = phoneNumber;
  if (address !== undefined) {
    mongoUpdates.address = {
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    };
  }
  if (profileImageUrl !== undefined) mongoUpdates.profileImageUrl = profileImageUrl;

  updates.push(`updated_at = NOW()`);
  params.push(userId);

  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, ssn, first_name, last_name, email, phone_number,
     address_line1, address_line2, address_city, address_state, address_zip_code,
     profile_image_url, role, loyalty_tier, profile_type, ssn_verified_at,
     partner_details, created_at, updated_at, last_login
  `;

  try {
    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      throw error;
    }

    await syncMongoUser(userId, mongoUpdates);

    // Invalidate user profile cache
    await invalidateUserProfileCache(userId);

    return result.rows[0];
  } catch (error) {
    if (isUsersTableMissing(error)) {
      logger.warn('PostgreSQL users table missing; applying MongoDB-only update');
      await syncMongoUser(userId, mongoUpdates);
      await invalidateUserProfileCache(userId);
      // Return the best-effort profile from Mongo (will skip Postgres)
      return getUserById(userId);
    }

    // Invalidate user profile cache before bubbling up other errors
    await invalidateUserProfileCache(userId);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  const pool = getPostgresPool();
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  
  // Invalidate user profile cache
  await invalidateUserProfileCache(userId);
  
  logger.info(`Deleted user ${userId}`);
};

export const getUserBookings = async (userId, filters) => {
  logger.info(`Getting bookings for user ${userId}`);
  const pool = getPostgresPool();

  const { page = 1, pageSize = 25, status } = filters || {};
  const limit = parseInt(pageSize, 10);
  const offset = (parseInt(page, 10) - 1) * limit;

  const params = [userId];
  let paramIndex = 2;

  let baseQuery = `
    SELECT id, booking_type, status, price_amount, price_currency, itinerary, metadata, created_at, updated_at
    FROM bookings
    WHERE user_id = $1
  `;

  if (status) {
    baseQuery += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const queryWithPaging = `${baseQuery} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  const pagingParams = [...params, limit, offset];

  const [result, countResult] = await Promise.all([
    pool.query(queryWithPaging, pagingParams),
    pool.query(`SELECT COUNT(*) AS total FROM (${baseQuery}) AS sub`, params),
  ]);

  const totalItems = parseInt(countResult.rows[0].total, 10);

  const parseItinerary = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const deriveTripWindow = (itinerary, bookingType, createdAt, updatedAt) => {
    const fallbackDate = updatedAt || createdAt || null;
    if (!itinerary) return { startDate: fallbackDate, endDate: fallbackDate };

    if (bookingType === 'hotel') {
      const startDate = itinerary.checkIn || itinerary.checkin || fallbackDate;
      const endDate = itinerary.checkOut || itinerary.checkout || startDate;
      return { startDate, endDate };
    }

    if (bookingType === 'car') {
      const startDate = itinerary.pickupDate || fallbackDate;
      const endDate = itinerary.dropoffDate || startDate;
      return { startDate, endDate };
    }

    // flights and defaults
    const startDate =
      itinerary.outbound?.departDate ||
      itinerary.departDate ||
      itinerary.return?.departDate ||
      fallbackDate;
    const endDate = itinerary.return?.departDate || startDate;
    return { startDate, endDate };
  };

  const now = new Date();

  const items = result.rows.map((row) => {
    const itinerary = parseItinerary(row.itinerary);
    const { startDate, endDate } = deriveTripWindow(
      itinerary,
      row.booking_type,
      row.created_at,
      row.updated_at
    );

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let timeline = 'upcoming';
    if (end && end < now) {
      timeline = 'past';
    } else if (start && start <= now && end && end >= now) {
      timeline = 'current';
    }

    return {
      id: row.id,
      bookingType: row.booking_type,
      status: row.status,
      price: {
        amount: row.price_amount ? parseFloat(row.price_amount) : null,
        currency: row.price_currency || 'USD',
      },
      itinerary,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      timeline,
      startDate,
      endDate,
    };
  });

  return {
    items,
    pagination: {
      page: parseInt(page, 10),
      pageSize: limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
};

export const createUserBooking = async (userId, bookingData) => {
  logger.info(`Creating booking for user ${userId}`);
  return {};
};

export const getUserReviews = async (userId) => {
  const pool = getPostgresPool();
  const result = await pool.query(
    'SELECT * FROM reviews WHERE user_id = $1',
    [userId]
  );
  return result.rows;
};
