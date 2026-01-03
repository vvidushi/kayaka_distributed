import * as authService from '../services/auth.service.js';
import { logger } from '../config/logger.js';
import { doesProfileRequireSsn } from '../constants/profileTypes.js';
import { normalizeProfileType } from '../utils/profile.js';

export const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      code: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        code: 'CONFLICT',
        message: error.message,
      });
    }
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      });
    }

    const result = await authService.login(email, password);
    res.json({
      code: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    logger.error('Login error:', error);
    if (
      error.message === 'Invalid email or password' ||
      error.message === 'Account is suspended'
    ) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: error.message,
      });
    }
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const result = await authService.refreshToken(userId);
    res.json({
      code: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    if (error.message === 'Account is suspended') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: error.message,
      });
    }
    next(error);
  }
};

export const logout = async (req, res) => {
  res.json({
    code: 'SUCCESS',
    message: 'Logged out successfully',
  });
};

export const getMe = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const user = await authService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const profileType = normalizeProfileType(user.profileType);
    const requiresSsn = doesProfileRequireSsn(profileType);
    const hasSsn = Boolean(user.ssn);

    res.json({
      code: 'SUCCESS',
      data: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        loyaltyTier: user.loyaltyTier,
        profileImageUrl: user.profileImageUrl,
        profileType,
        requiresSsn,
        hasSsnOnFile: hasSsn,
        partnerDetails: user.partnerProfile || user.partnerDetails || null,
        compliance: {
          requiresSsn,
          ssnOnFile: hasSsn,
          verifiedAt: user.ssnVerifiedAt || null,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Get me error:', error);
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const updates = req.body;
    const updatedUser = await authService.updateUserProfile(userId, updates);

    res.json({
      code: 'SUCCESS',
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message,
      });
    }
    next(error);
  }
};
