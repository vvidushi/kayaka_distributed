import * as profileService from '../services/profile.service.js';
import { logger } from '../config/logger.js';

const requireAuthUser = (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
    return null;
  }
  return userId;
};

export const getProfile = async (req, res, next) => {
  const userId = requireAuthUser(req, res);
  if (!userId) return;

  try {
    const profile = await profileService.getProfile(userId);
    if (!profile) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Profile not found',
      });
    }

    res.json({
      code: 'SUCCESS',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const createProfile = async (req, res, next) => {
  const userId = requireAuthUser(req, res);
  if (!userId) return;

  try {
    const profile = await profileService.createProfile(userId, req.body);
    res.status(201).json({
      code: 'SUCCESS',
      data: profile,
    });
  } catch (error) {
    if (['VALIDATION_ERROR', 'CONFLICT'].includes(error.code)) {
      return res.status(error.code === 'CONFLICT' ? 409 : 400).json({
        code: error.code,
        message: error.message,
      });
    }
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  const userId = requireAuthUser(req, res);
  if (!userId) return;

  try {
    const profile = await profileService.updateProfile(userId, req.body);
    res.json({
      code: 'SUCCESS',
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message,
      });
    }
    next(error);
  }
};

export const deleteProfile = async (req, res, next) => {
  const userId = requireAuthUser(req, res);
  if (!userId) return;

  try {
    await profileService.deleteProfile(userId);
    res.json({
      code: 'SUCCESS',
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    if (error.code === 'ACTIVE_BOOKINGS') {
      return res.status(400).json({
        code: 'ACTIVE_BOOKINGS',
        message: error.message,
        details: error.details,
      });
    }
    next(error);
  }
};
