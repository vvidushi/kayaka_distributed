/**
 * Error Handler Utility
 * Centralized error handling for API calls and user feedback
 */

/**
 * Extract error message from error object
 */
export const getErrorMessage = (error) => {
  // If error has a response from API
  if (error.response?.data) {
    const { data } = error.response;
    
    // Handle validation errors
    if (data.errors && Array.isArray(data.errors)) {
      return data.errors.map(err => err.message || err.msg).join(', ');
    }
    
    // Handle standard error message
    if (data.message) {
      return data.message;
    }
  }

  // Handle network errors
  if (error.message === 'Network Error') {
    return 'Network error. Please check your internet connection.';
  }

  // Handle timeout errors
  if (error.code === 'ECONNABORTED') {
    return 'Request timeout. Please try again.';
  }

  // Handle 404 errors
  if (error.response?.status === 404) {
    return 'Resource not found.';
  }

  // Handle 401 errors
  if (error.response?.status === 401) {
    return 'Authentication required. Please log in.';
  }

  // Handle 403 errors
  if (error.response?.status === 403) {
    return 'You do not have permission to access this resource.';
  }

  // Handle 500 errors
  if (error.response?.status >= 500) {
    return 'Server error. Please try again later.';
  }

  // Default error message
  return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Handle API errors with toast notification
 * @param {Error} error - The error object
 * @param {Function} showToast - Toast function from useToast hook
 * @param {string} defaultMessage - Optional default message
 */
export const handleApiError = (error, showToast, defaultMessage = null) => {
  const message = defaultMessage || getErrorMessage(error);
  
  if (showToast) {
    showToast(message, 'error');
  }

  // Log error for debugging
  console.error('API Error:', {
    message,
    error,
    response: error.response?.data,
    status: error.response?.status,
  });

  return message;
};

/**
 * Show success message
 */
export const handleApiSuccess = (message, showToast) => {
  if (showToast) {
    showToast(message, 'success');
  }
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors) => {
  if (!errors || !Array.isArray(errors)) return null;

  return errors.map(err => {
    if (err.field && err.message) {
      return `${err.field}: ${err.message}`;
    }
    return err.message || err.msg || 'Validation error';
  }).join('\n');
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async (
  fn,
  maxRetries = 3,
  baseDelay = 1000,
  showToast = null
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, i);
      
      if (showToast) {
        showToast(`Request failed. Retrying in ${delay / 1000}s...`, 'warning', delay);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error) => {
  return (
    error.message === 'Network Error' ||
    error.code === 'ECONNABORTED' ||
    !error.response
  );
};

/**
 * Check if error should trigger a retry
 */
export const shouldRetry = (error) => {
  // Retry on network errors
  if (isNetworkError(error)) {
    return true;
  }

  // Retry on 5xx errors
  if (error.response?.status >= 500) {
    return true;
  }

  // Retry on 429 (too many requests)
  if (error.response?.status === 429) {
    return true;
  }

  return false;
};

export default {
  getErrorMessage,
  handleApiError,
  handleApiSuccess,
  formatValidationErrors,
  retryWithBackoff,
  isNetworkError,
  shouldRetry,
};
