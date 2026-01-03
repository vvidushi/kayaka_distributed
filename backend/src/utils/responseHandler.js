/**
 * Standardized response handlers
 * Provides consistent API response format across the application
 */

/**
 * Success response
 */
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    status: 'success',
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Created response (201)
 */
export const createdResponse = (res, data, message = 'Resource created successfully') => {
  return successResponse(res, data, message, 201);
};

/**
 * No content response (204)
 */
export const noContentResponse = (res) => {
  return res.status(204).send();
};

/**
 * Paginated response
 */
export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    status: 'success',
    statusCode: 200,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit || pagination.pageSize,
      totalItems: pagination.totalItems || pagination.total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.page < pagination.totalPages,
      hasPrevPage: pagination.page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Error response (should be handled by error middleware, but included for completeness)
 */
export const errorResponse = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    status: statusCode >= 500 ? 'error' : 'fail',
    statusCode,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  });
};

export default {
  successResponse,
  createdResponse,
  noContentResponse,
  paginatedResponse,
  errorResponse,
};

