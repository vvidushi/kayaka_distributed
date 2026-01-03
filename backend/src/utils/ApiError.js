/**
 * Custom API Error Class
 * Standardized error handling across the application
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

/**
 * Error factory functions for common HTTP errors
 */

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(422, message);
    this.errors = errors;
  }

  toJSON() {
    return {
      status: this.status,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error') {
    super(500, message);
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service Unavailable') {
    super(503, message);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message = 'Too Many Requests') {
    super(429, message);
  }
}

/**
 * Create ApiError from various error types
 */
export const createApiError = (error) => {
  // If already an ApiError, return as-is
  if (error instanceof ApiError) {
    return error;
  }

  // Handle specific error codes
  if (error.code) {
    switch (error.code) {
      case 'NOT_FOUND':
        return new NotFoundError(error.message);
      case 'INVALID_SSN':
      case 'INVALID_ADDRESS':
      case 'INVALID_INPUT':
        return new BadRequestError(error.message);
      case 'UNAUTHORIZED':
        return new UnauthorizedError(error.message);
      case 'FORBIDDEN':
        return new ForbiddenError(error.message);
      case 'CONFLICT':
        return new ConflictError(error.message);
      default:
        break;
    }
  }

  // Handle database errors
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if (error.code === 11000) {
      return new ConflictError('Duplicate entry found');
    }
    return new InternalServerError('Database error');
  }

  // Handle PostgreSQL errors
  if (error.code && error.code.startsWith('23')) {
    if (error.code === '23505') {
      return new ConflictError('Duplicate entry found');
    }
    if (error.code === '23503') {
      return new BadRequestError('Referenced resource not found');
    }
    return new BadRequestError('Database constraint violation');
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token expired');
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message);
  }

  // Default to internal server error
  return new InternalServerError(
    process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  );
};

export default ApiError;

