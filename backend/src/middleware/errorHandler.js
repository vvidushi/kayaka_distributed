import { logger } from '../config/logger.js';
import ApiError, { createApiError, InternalServerError } from '../utils/ApiError.js';

/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 */
export const errorHandler = (err, req, res, next) => {
  // Convert error to ApiError if it isn't already
  const apiError = err instanceof ApiError ? err : createApiError(err);

  // Log error details
  logger.error('Error occurred:', {
    message: apiError.message,
    statusCode: apiError.statusCode,
    status: apiError.status,
    stack: apiError.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    correlationId: req.correlationId || req.id,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
    query: process.env.NODE_ENV === 'development' ? req.query : undefined,
  });

  const isDevelopment = process.env.NODE_ENV === 'development';

  // Prepare response
  const response = {
    success: false,
    status: apiError.status,
    statusCode: apiError.statusCode,
    message: apiError.message,
    ...(apiError.errors && { errors: apiError.errors }),
    ...(isDevelopment && { stack: apiError.stack }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl || req.url,
    correlationId: req.correlationId || req.id,
  };

  // Send response
  res.status(apiError.statusCode).json(response);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Validation error handler
 * Formats express-validator errors
 */
export const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value,
    }));

    const error = new ApiError(422, 'Validation failed');
    error.errors = formattedErrors;
    return next(error);
  }
  
  next();
};

