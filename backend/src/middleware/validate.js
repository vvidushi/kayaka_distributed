import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/ApiError.js';

/**
 * Validation middleware
 * Checks express-validator results and throws ValidationError if validation fails
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
      location: err.location,
    }));

    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
};

export default validate;

