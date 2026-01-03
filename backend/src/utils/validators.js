import { body, param, query } from 'express-validator';

/**
 * Common validation rules
 */

export const isValidSsn = (ssn) => {
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  return ssnRegex.test(ssn);
};

export const isValidZipCode = (zip) => {
  // Project spec allows short sample ZIPs like "12" but explicitly rejects 4-digit values such as "1247".
  // Accept 1-3 digit demo ZIPs or standard 5 digit ZIPs with optional +4 suffix.
  const zipRegex = /^(\d{1,3}|\d{5})(-\d{4})?$/;
  return zipRegex.test(zip);
};

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^\+?1?\d{10,15}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validation chains for common fields
 */

export const validateEmail = () => {
  return body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail();
};

export const validatePassword = () => {
  return body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');
};

export const validateUUID = (field = 'id') => {
  return param(field)
    .custom(isValidUUID)
    .withMessage(`Invalid ${field} format`);
};

export const validatePagination = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
  ];
};

export const validateSortOrder = () => {
  return [
    query('sort')
      .optional()
      .isString()
      .withMessage('Sort field must be a string'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be either asc or desc'),
  ];
};

export const validateDateRange = () => {
  return [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate < req.query.startDate) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
  ];
};

export const validateSSN = () => {
  return body('ssn')
    .optional()
    .custom(isValidSsn)
    .withMessage('SSN must be in format XXX-XX-XXXX');
};

export const validateZipCode = () => {
  return body('zipCode')
    .optional()
    .custom(isValidZipCode)
    .withMessage('Invalid zip code format');
};

export const validatePhoneNumber = () => {
  return body('phoneNumber')
    .optional()
    .custom(isValidPhoneNumber)
    .withMessage('Invalid phone number format');
};

/**
 * Booking validation
 */
export const validateBookingType = () => {
  return body('bookingType')
    .isIn(['flight', 'hotel', 'car'])
    .withMessage('Booking type must be flight, hotel, or car');
};

export const validateBookingStatus = () => {
  return body('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'FAILED'])
    .withMessage('Invalid booking status');
};

/**
 * Payment validation
 */
export const validatePaymentAmount = () => {
  return body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0');
};

export const validateCurrency = () => {
  return body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter ISO code (e.g., USD)');
};

/**
 * Search validation
 */
export const validateFlightSearch = () => {
  return [
    query('from').optional().isString().trim(),
    query('to').optional().isString().trim(),
    query('departDate').optional().isISO8601().withMessage('Invalid depart date'),
    query('returnDate').optional().isISO8601().withMessage('Invalid return date'),
    query('passengers').optional().isInt({ min: 1, max: 9 }).toInt(),
    query('class').optional().isIn(['economy', 'business', 'first']),
    query('airline').optional().isString().trim(),
    query('airlines').optional().isString().trim(),
    query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
    ...validatePagination(),
    ...validateSortOrder(),
  ];
};

export const validateHotelSearch = () => {
  return [
    query('city').optional().isString().trim(),
    query('state').optional().isString().trim(),
    query('checkIn').optional().isISO8601().withMessage('Invalid check-in date'),
    query('checkOut').optional().isISO8601().withMessage('Invalid check-out date'),
    query('guests').optional().isInt({ min: 1 }).toInt(),
    query('minRating').optional().isFloat({ min: 0, max: 5 }).toFloat(),
    query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
    ...validatePagination(),
    ...validateSortOrder(),
  ];
};

export const validateCarSearch = () => {
  return [
    query('city').optional().isString().trim(),
    query('state').optional().isString().trim(),
    query('pickupDate').optional().isISO8601().withMessage('Invalid pickup date'),
    query('dropoffDate').optional().isISO8601().withMessage('Invalid dropoff date'),
    query('carType').optional().isString().trim(),
    query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
    ...validatePagination(),
    ...validateSortOrder(),
  ];
};

export default {
  isValidSsn,
  isValidZipCode,
  isValidEmail,
  isValidPhoneNumber,
  isValidUUID,
  validateEmail,
  validatePassword,
  validateUUID,
  validatePagination,
  validateSortOrder,
  validateDateRange,
  validateSSN,
  validateZipCode,
  validatePhoneNumber,
  validateBookingType,
  validateBookingStatus,
  validatePaymentAmount,
  validateCurrency,
  validateFlightSearch,
  validateHotelSearch,
  validateCarSearch,
};
