import { logger } from '../config/logger.js';
import * as userService from '../services/users.service.js';

export const listUsers = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 25, email, state } = req.query;
    const result = await userService.listUsers({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      email,
      state
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR' || error.code === 'INVALID_SSN') {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }
    if (error.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({
        code: 'CONFLICT',
        message: error.message,
      });
    }
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    if (userId !== currentUserId && currentUserRole !== 'admin' && currentUserRole !== 'moderator') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You can only access your own profile'
      });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'User not found'
      });
    }

    // Format response - handle both PostgreSQL and MongoDB formats
    const { password_hash, ...userWithoutPassword } = user;
    
    // Normalize field names for consistent API response
    // Ensure firstName, lastName, and email always have values (default to empty string if null/undefined)
    const formattedUser = {
      id: userWithoutPassword.id,
      email: userWithoutPassword.email || userWithoutPassword.email_address || '',
      firstName: userWithoutPassword.first_name || userWithoutPassword.firstName || '',
      lastName: userWithoutPassword.last_name || userWithoutPassword.lastName || '',
      phoneNumber: userWithoutPassword.phone_number || userWithoutPassword.phoneNumber || null,
      address: {
        line1: userWithoutPassword.address_line1 || userWithoutPassword.address?.line1,
        line2: userWithoutPassword.address_line2 || userWithoutPassword.address?.line2,
        city: userWithoutPassword.address_city || userWithoutPassword.address?.city,
        state: userWithoutPassword.address_state || userWithoutPassword.address?.state,
        zipCode: userWithoutPassword.address_zip_code || userWithoutPassword.address?.zipCode,
      },
      profileImageUrl: userWithoutPassword.profile_image_url || userWithoutPassword.profileImageUrl,
      role: userWithoutPassword.role,
      loyaltyTier: userWithoutPassword.loyalty_tier || userWithoutPassword.loyaltyTier,
      profileType: userWithoutPassword.profile_type || userWithoutPassword.profileType,
      ssn: userWithoutPassword.ssn,
      ssnVerifiedAt: userWithoutPassword.ssn_verified_at || userWithoutPassword.ssnVerifiedAt,
      partnerDetails: typeof userWithoutPassword.partner_details === 'string' 
        ? JSON.parse(userWithoutPassword.partner_details) 
        : userWithoutPassword.partner_details || userWithoutPassword.partnerProfile,
      createdAt: userWithoutPassword.created_at || userWithoutPassword.createdAt,
      updatedAt: userWithoutPassword.updated_at || userWithoutPassword.updatedAt,
      lastLogin: userWithoutPassword.last_login || userWithoutPassword.lastLogin,
    };
    
    res.json(formattedUser);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    if (userId !== currentUserId && currentUserRole !== 'admin' && currentUserRole !== 'moderator') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You can only update your own profile'
      });
    }

    const user = await userService.updateUser(userId, req.body);
    
    // Format response - handle both PostgreSQL and MongoDB formats
    const { password_hash, ...userWithoutPassword } = user;
    
    // Normalize field names for consistent API response
    // Ensure firstName, lastName, and email always have values (default to empty string if null/undefined)
    const formattedUser = {
      id: userWithoutPassword.id,
      email: userWithoutPassword.email || userWithoutPassword.email_address || '',
      firstName: userWithoutPassword.first_name || userWithoutPassword.firstName || '',
      lastName: userWithoutPassword.last_name || userWithoutPassword.lastName || '',
      phoneNumber: userWithoutPassword.phone_number || userWithoutPassword.phoneNumber || null,
      address: {
        line1: userWithoutPassword.address_line1 || userWithoutPassword.address?.line1,
        line2: userWithoutPassword.address_line2 || userWithoutPassword.address?.line2,
        city: userWithoutPassword.address_city || userWithoutPassword.address?.city,
        state: userWithoutPassword.address_state || userWithoutPassword.address?.state,
        zipCode: userWithoutPassword.address_zip_code || userWithoutPassword.address?.zipCode,
      },
      profileImageUrl: userWithoutPassword.profile_image_url || userWithoutPassword.profileImageUrl,
      role: userWithoutPassword.role,
      loyaltyTier: userWithoutPassword.loyalty_tier || userWithoutPassword.loyaltyTier,
      profileType: userWithoutPassword.profile_type || userWithoutPassword.profileType,
      ssn: userWithoutPassword.ssn,
      ssnVerifiedAt: userWithoutPassword.ssn_verified_at || userWithoutPassword.ssnVerifiedAt,
      partnerDetails: typeof userWithoutPassword.partner_details === 'string' 
        ? JSON.parse(userWithoutPassword.partner_details) 
        : userWithoutPassword.partner_details || userWithoutPassword.partnerProfile,
      createdAt: userWithoutPassword.created_at || userWithoutPassword.createdAt,
      updatedAt: userWithoutPassword.updated_at || userWithoutPassword.updatedAt,
      lastLogin: userWithoutPassword.last_login || userWithoutPassword.lastLogin,
    };
    
    res.json(formattedUser);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    if (userId !== currentUserId && currentUserRole !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only admins can delete other users'
      });
    }

    await userService.deleteUser(userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateUserSsn = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { ssn } = req.body || {};
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    if (userId !== currentUserId && currentUserRole !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You can only update your own SSN',
      });
    }

    if (!ssn) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'SSN is required',
      });
    }

    const updated = await userService.updateUserSsn(userId, ssn);
    const requiresSsn = updated.profile_type === 'property_owner';

    res.json({
      code: 'SUCCESS',
      data: {
        profileType: updated.profile_type,
        compliance: {
          requiresSsn,
          ssnOnFile: true,
          verifiedAt: updated.ssn_verified_at,
        },
      },
    });
  } catch (error) {
    if (error.code === 'INVALID_SSN') {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    if (error.code === '23505') {
      return res.status(409).json({
        code: 'CONFLICT',
        message: 'SSN is already associated with another account',
      });
    }

    if (error.code === 'SSN_EMAIL_MISMATCH') {
      return res.status(409).json({
        code: 'CONFLICT',
        message: error.message,
      });
    }

    next(error);
  }
};

export const getUserBookings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    if (userId !== currentUserId && currentUserRole !== 'admin' && currentUserRole !== 'moderator') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You can only access your own bookings'
      });
    }

    const { page = 1, pageSize = 25, status } = req.query;
    const result = await userService.getUserBookings(userId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createUserBooking = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    if (userId !== currentUserId) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You can only create bookings for yourself'
      });
    }

    const booking = await userService.createUserBooking(userId, req.body);
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

export const getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    if (userId !== currentUserId && currentUserRole !== 'admin' && currentUserRole !== 'moderator') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You can only access your own reviews'
      });
    }

    const reviews = await userService.getUserReviews(userId);
    res.json({ items: reviews });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    // Users can deactivate their own account, admins can deactivate any account
    if (userId !== currentUserId && currentUserRole !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You can only deactivate your own account or need admin privileges'
      });
    }

    // Prevent admins from deactivating themselves
    if (userId === currentUserId && currentUserRole === 'admin') {
      return res.status(400).json({
        code: 'BAD_REQUEST',
        message: 'Admins cannot deactivate their own account'
      });
    }

    const user = await userService.deactivateUser(userId);
    
    // Format response
    const { password_hash, ...userWithoutPassword } = user;
    const formattedUser = {
      id: userWithoutPassword.id,
      email: userWithoutPassword.email || '',
      firstName: userWithoutPassword.first_name || userWithoutPassword.firstName || '',
      lastName: userWithoutPassword.last_name || userWithoutPassword.lastName || '',
      role: userWithoutPassword.role,
    };
    
    res.json({
      code: 'SUCCESS',
      message: 'User account deactivated successfully',
      data: formattedUser
    });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message
      });
    }
    next(error);
  }
};

export const reactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserRole = req.user?.role;

    // Only admins can reactivate accounts
    if (currentUserRole !== 'admin') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only admins can reactivate accounts'
      });
    }

    const user = await userService.reactivateUser(userId);
    
    // Format response
    const { password_hash, ...userWithoutPassword } = user;
    const formattedUser = {
      id: userWithoutPassword.id,
      email: userWithoutPassword.email || '',
      firstName: userWithoutPassword.first_name || userWithoutPassword.firstName || '',
      lastName: userWithoutPassword.last_name || userWithoutPassword.lastName || '',
      role: userWithoutPassword.role,
    };
    
    res.json({
      code: 'SUCCESS',
      message: 'User account reactivated successfully',
      data: formattedUser
    });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message
      });
    }
    next(error);
  }
};
