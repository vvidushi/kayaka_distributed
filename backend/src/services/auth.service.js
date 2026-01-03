import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getMongoDB, getPostgresPool } from '../config/database.js';
import { logger } from '../config/logger.js';
import { ObjectId } from 'mongodb';
import { doesProfileRequireSsn } from '../constants/profileTypes.js';
import { isValidSsn } from '../utils/validators.js';
import {
  normalizeProfileType,
  normalizePartnerDetails,
} from '../utils/profile.js';
import { getJWTSecret, getJWTExpiresIn } from '../config/jwt.js';
import { invalidateUserProfileCache } from '../utils/cache.js';

const SALT_ROUNDS = 12;

const parsePartnerDetails = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return value;
};

export const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

const mapUserForResponse = (user) => {
  const profileType = normalizeProfileType(user.profileType);
  const requiresSsn = doesProfileRequireSsn(profileType);
  const hasSsnOnFile = Boolean(user.ssn);
  const partnerDetails = user.partnerProfile || parsePartnerDetails(user.partnerDetails); // Support both fields

  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    role: user.role,
    loyaltyTier: user.loyaltyTier || 'none',
    profileImageUrl: user.profileImageUrl || null, // Added profile image URL
    profileType,
    requiresSsn,
    hasSsnOnFile,
    compliance: {
      profileType,
      requiresSsn,
      isSsnOnFile: hasSsnOnFile,
      verifiedAt: user.ssnVerifiedAt || null,
    },
    partnerDetails,
  };
};

export const generateToken = (user) => {
  const payload = {
    id: user._id ? user._id.toString() : user.id,  // Changed from userId to id for consistency
    userId: user._id ? user._id.toString() : user.id, // Keep userId for backward compatibility
    email: user.email,
    role: user.role || 'user',
    profileType: normalizeProfileType(user.profileType),
  };

  return jwt.sign(payload, getJWTSecret(), {
    expiresIn: getJWTExpiresIn(),
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJWTSecret());
  } catch (error) {
    return null;
  }
};

export const register = async (userData) => {
  const db = await getMongoDB();
  const usersCollection = db.collection('users');

  const {
    email,
    password,
    ssn,
    firstName,
    lastName,
    phoneNumber,
    address,
    profileType,
    partnerProfile = null,
  } = userData;

  const normalizedProfileType = normalizeProfileType(profileType);
  const partnerDetails = normalizePartnerDetails(normalizedProfileType, partnerProfile);

  if (ssn && !isValidSsn(ssn)) {
    throw new Error('SSN must match XXX-XX-XXXX');
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  const hashedPassword = await hashPassword(password);

  const newUser = {
    email,
    passwordHash: hashedPassword,
    ssn: ssn || null,
    firstName,
    lastName,
    phoneNumber,
    address: {
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    },
    role: 'user',
    loyaltyTier: 'none',
    profileType: normalizedProfileType,
    ssnVerifiedAt: ssn ? new Date() : null,
    partnerProfile: partnerDetails || null, // Changed to partnerProfile for consistency
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await usersCollection.insertOne(newUser);
  const user = { ...newUser, _id: result.insertedId };

  const token = generateToken(user);

  logger.info(`User registered successfully: ${email}`);

  return {
    user: mapUserForResponse(user),
    token,
  };
};

export const login = async (email, password) => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  if (user.role === 'suspended') {
    throw new Error('Account is suspended');
  }

  if (!user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user);

  logger.info(`User logged in: ${email}`);

  return {
    user: mapUserForResponse(user),
    token,
  };
};

export const getUserByEmail = async (email) => {
  const db = await getMongoDB();
  const usersCollection = db.collection('users');
  
  const user = await usersCollection.findOne({ email });
  return user;
};

export const getUserById = async (userId) => {
  const db = await getMongoDB();
  const usersCollection = db.collection('users');

  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  return user;
};

export const updateUserProfile = async (userId, updates) => {
  const db = await getMongoDB();
  const usersCollection = db.collection('users');

  // Remove sensitive fields that shouldn't be updated through this endpoint
  const { passwordHash, _id, email, role, createdAt, ...allowedUpdates } = updates;

  // Add updatedAt timestamp
  allowedUpdates.updatedAt = new Date();

  const result = await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: allowedUpdates }
  );

  if (result.matchedCount === 0) {
    throw new Error('User not found');
  }

  // Also update PostgreSQL if user exists there
  try {
    const pool = getPostgresPool();
    const pgUpdates = [];
    const params = [];
    let paramIndex = 1;

    if (allowedUpdates.firstName !== undefined) {
      pgUpdates.push(`first_name = $${paramIndex++}`);
      params.push(allowedUpdates.firstName);
    }
    if (allowedUpdates.lastName !== undefined) {
      pgUpdates.push(`last_name = $${paramIndex++}`);
      params.push(allowedUpdates.lastName);
    }
    if (allowedUpdates.phoneNumber !== undefined) {
      pgUpdates.push(`phone_number = $${paramIndex++}`);
      params.push(allowedUpdates.phoneNumber);
    }
    if (allowedUpdates.address !== undefined) {
      pgUpdates.push(`address_line1 = $${paramIndex++}`);
      params.push(allowedUpdates.address.line1 || null);
      pgUpdates.push(`address_line2 = $${paramIndex++}`);
      params.push(allowedUpdates.address.line2 || null);
      pgUpdates.push(`address_city = $${paramIndex++}`);
      params.push(allowedUpdates.address.city || null);
      pgUpdates.push(`address_state = $${paramIndex++}`);
      params.push(allowedUpdates.address.state || null);
      pgUpdates.push(`address_zip_code = $${paramIndex++}`);
      params.push(allowedUpdates.address.zipCode || null);
    }
    if (allowedUpdates.profileImageUrl !== undefined) {
      pgUpdates.push(`profile_image_url = $${paramIndex++}`);
      params.push(allowedUpdates.profileImageUrl);
    }

    if (pgUpdates.length > 0) {
      pgUpdates.push(`updated_at = NOW()`);
      params.push(userId);
      
      await pool.query(
        `UPDATE users SET ${pgUpdates.join(', ')} WHERE id = $${paramIndex}`,
        params
      );
      logger.info(`Synced user update to PostgreSQL: ${userId}`);
    }
  } catch (pgError) {
    // Log but don't fail if PostgreSQL update fails (user might not exist in PostgreSQL)
    logger.warn(`Failed to sync user update to PostgreSQL: ${pgError.message}`);
  }

  // Invalidate user profile cache
  await invalidateUserProfileCache(userId);

  const updatedUser = await getUserById(userId);
  logger.info(`User profile updated: ${userId}`);

  return mapUserForResponse(updatedUser);
};

export const refreshToken = async (userId) => {
  const user = await getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'suspended') {
    throw new Error('Account is suspended');
  }

  const token = generateToken(user);

  return {
    user: mapUserForResponse(user),
    token,
  };
};

export const deleteUserAccount = async (userId) => {
  const db = await getMongoDB();
  const usersCollection = db.collection('users');
  const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
  logger.info(`Deleted Mongo user ${userId}: deletedCount=${result.deletedCount}`);
  return result.deletedCount > 0;
};

export default {
  register,
  login,
  getUserByEmail,
  getUserById,
  refreshToken,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  deleteUserAccount,
};
