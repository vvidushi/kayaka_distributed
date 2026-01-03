import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';
import { getJWTSecret } from '../config/jwt.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication token required'
    });
  }

  try {
    const decoded = jwt.verify(token, getJWTSecret());
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn(`Invalid token: ${error.message}`);
    logger.debug(`Token (first 20 chars): ${token.substring(0, 20)}...`);
    logger.debug(`Error name: ${error.name}`);
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Invalid or expired token'
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Admin privileges required'
    });
  }

  next();
};

export const requireModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  if (!['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Moderator privileges required'
    });
  }

  next();
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Insufficient privileges'
      });
    }

    next();
  };
};

export const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }

  if (req.user.profileType !== 'owner') {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Owner account required. Only property owners can access this resource.'
    });
  }

  next();
};

