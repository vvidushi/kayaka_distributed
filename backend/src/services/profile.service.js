import { logger } from '../config/logger.js';
import * as usersService from './users.service.js';
import * as authService from './auth.service.js';
import { getBlockingBookingsForDeletion } from './bookings.service.js';
import { invalidateUserProfileCache } from '../utils/cache.js';

const buildError = (code, message, details) => {
  const error = new Error(message);
  error.code = code;
  if (details) {
    error.details = details;
  }
  return error;
};

const parsePartnerDetails = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    logger.warn(`Failed to parse partner details: ${error.message}`);
    return null;
  }
};

const formatUserRecord = (userRecord) => {
  if (!userRecord) return null;

  return {
    id: userRecord.id,
    email: userRecord.email,
    firstName: userRecord.first_name || userRecord.firstName || '',
    lastName: userRecord.last_name || userRecord.lastName || '',
    phoneNumber: userRecord.phone_number || userRecord.phoneNumber || '',
    address: {
      line1: userRecord.address_line1 || userRecord.address?.line1 || '',
      line2: userRecord.address_line2 || userRecord.address?.line2 || '',
      city: userRecord.address_city || userRecord.address?.city || '',
      state: userRecord.address_state || userRecord.address?.state || '',
      zipCode: userRecord.address_zip_code || userRecord.address?.zipCode || '',
    },
    profileImageUrl: userRecord.profile_image_url || userRecord.profileImageUrl || null,
    profileType: userRecord.profile_type || userRecord.profileType || 'traveler',
    role: userRecord.role || 'user',
    loyaltyTier: userRecord.loyalty_tier || userRecord.loyaltyTier || 'none',
    ssn: userRecord.ssn || null,
    ssnVerifiedAt: userRecord.ssn_verified_at || userRecord.ssnVerifiedAt || null,
    partnerDetails:
      parsePartnerDetails(userRecord.partner_details) ||
      userRecord.partnerDetails ||
      userRecord.partnerProfile ||
      null,
    dataSource: userRecord.data_source || (userRecord._id ? 'mongo' : 'postgres'),
    createdAt: userRecord.created_at || userRecord.createdAt || null,
    updatedAt: userRecord.updated_at || userRecord.updatedAt || null,
  };
};

export const getProfile = async (userId) => {
  const record = await usersService.getUserById(userId);
  return formatUserRecord(record);
};

export const createProfile = async (userId, payload = {}) => {
  const existing = await usersService.getUserById(userId);
  if (existing) {
    throw buildError('CONFLICT', 'Profile already exists');
  }

  const mongoUser = await authService.getUserById(userId).catch(() => null);

  const data = {
    userId,
    email: payload.email || mongoUser?.email,
    firstName: payload.firstName || mongoUser?.firstName || '',
    lastName: payload.lastName || mongoUser?.lastName || '',
    phoneNumber: payload.phoneNumber || mongoUser?.phoneNumber || '',
    address: {
      line1: payload.address?.line1 || mongoUser?.address?.line1 || '',
      line2: payload.address?.line2 || mongoUser?.address?.line2 || null,
      city: payload.address?.city || mongoUser?.address?.city || '',
      state: payload.address?.state || mongoUser?.address?.state || '',
      zipCode: payload.address?.zipCode || mongoUser?.address?.zipCode || '',
    },
    profileImageUrl: payload.profileImageUrl || mongoUser?.profileImageUrl || null,
    profileType: payload.profileType || mongoUser?.profileType || 'traveler',
    partnerDetails: payload.partnerDetails || mongoUser?.partnerProfile || mongoUser?.partnerDetails || null,
  };

  if (!data.email) {
    throw buildError('VALIDATION_ERROR', 'Email is required to create a profile');
  }

  const created = await usersService.createUser(data);
  await invalidateUserProfileCache(userId);
  return formatUserRecord({ ...created, data_source: 'postgres' });
};

export const updateProfile = async (userId, updates) => {
  const existing = await usersService.getUserById(userId);
  if (!existing) {
    throw buildError('NOT_FOUND', 'Profile not found');
  }

  const normalizedUpdates = {
    firstName: updates.firstName ?? existing.first_name ?? existing.firstName,
    lastName: updates.lastName ?? existing.last_name ?? existing.lastName,
    phoneNumber: updates.phoneNumber ?? existing.phone_number ?? existing.phoneNumber,
    address: {
      line1: updates.address?.line1 ?? existing.address_line1 ?? existing.address?.line1 ?? '',
      line2: updates.address?.line2 ?? existing.address_line2 ?? existing.address?.line2 ?? '',
      city: updates.address?.city ?? existing.address_city ?? existing.address?.city ?? '',
      state: updates.address?.state ?? existing.address_state ?? existing.address?.state ?? '',
      zipCode: updates.address?.zipCode ?? existing.address_zip_code ?? existing.address?.zipCode ?? '',
    },
    profileImageUrl: updates.profileImageUrl ?? existing.profile_image_url ?? existing.profileImageUrl,
    profileType: updates.profileType ?? existing.profile_type ?? existing.profileType,
    partnerDetails:
      updates.partnerDetails ??
      parsePartnerDetails(existing.partner_details) ??
      existing.partnerProfile ??
      existing.partnerDetails ??
      null,
  };

  const mongoUser = await authService.getUserById(userId).catch(() => null);
  if (mongoUser) {
    try {
      await authService.updateUserProfile(userId, normalizedUpdates);
    } catch (error) {
      logger.warn(`Failed to update Mongo profile for ${userId}: ${error.message}`);
    }
  }

  try {
    await usersService.updateUser(userId, normalizedUpdates);
  } catch (error) {
    // If the user isn't in Postgres yet, seed it once
    if (error.code === 'NOT_FOUND' || error.message?.includes('not found')) {
      await usersService.createUser({
        userId,
        email: existing.email,
        firstName: normalizedUpdates.firstName,
        lastName: normalizedUpdates.lastName,
        phoneNumber: normalizedUpdates.phoneNumber,
        address: normalizedUpdates.address,
        profileImageUrl: normalizedUpdates.profileImageUrl,
        profileType: normalizedUpdates.profileType,
        partnerDetails: normalizedUpdates.partnerDetails,
      });
    } else {
      throw error;
    }
  }
  await invalidateUserProfileCache(userId);

  return await getProfile(userId);
};

export const deleteProfile = async (userId) => {
  const blockers = await getBlockingBookingsForDeletion(userId);
  if (blockers.length > 0) {
    throw buildError(
      'ACTIVE_BOOKINGS',
      'Cannot delete profile with active or recent bookings. Wait until 30 days after the latest booking end date.',
      blockers
    );
  }

  await usersService.deleteUser(userId);

  try {
    await authService.deleteUserAccount(userId);
  } catch (error) {
    logger.warn(`Failed to delete Mongo user ${userId}: ${error.message}`);
  }

  await invalidateUserProfileCache(userId);
  return true;
};
