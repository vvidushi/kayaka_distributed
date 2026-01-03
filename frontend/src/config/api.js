import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Clean up params: remove null, undefined, and empty string values
    if (config.params) {
      const cleanedParams = {};
      Object.keys(config.params).forEach(key => {
        const value = config.params[key];
        // Only include param if it has a real value
        if (value !== null && value !== undefined && value !== '') {
          cleanedParams[key] = value;
        }
      });
      config.params = cleanedParams;
    }
    
    // Debug logging for flights/airlines API calls
    if (config.url && config.url.includes('flights')) {
      console.log('=== AXIOS REQUEST ===');
      console.log('URL:', config.url);
      console.log('Cleaned Params:', config.params);
      console.log('Full URL will be:', `${config.baseURL}${config.url}?${new URLSearchParams(config.params || {}).toString()}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (error, retryCount) => {
  if (retryCount >= MAX_RETRIES) {
    return false;
  }

  // Retry on network errors or 5xx errors
  if (!error.response) {
    return true; // Network error
  }

  const status = error.response.status;
  return status >= 500 || status === 429; // Server error or rate limit
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const currentPath = window.location.pathname;
    const config = error.config;
    
    // Retry logic
    if (config && shouldRetry(error, config.__retryCount || 0)) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      const delay = RETRY_DELAY * Math.pow(2, config.__retryCount - 1); // Exponential backoff
      
      await sleep(delay);
      return apiClient(config);
    }
    
    // Handle 401 Unauthorized or 403 Forbidden (token issues)
    if (error.response?.status === 401 || error.response?.status === 403) {
      const message = error.response?.data?.message || '';
      
      // Check if it's a token-related error
      if (
        message.includes('Invalid or expired token') ||
        message.includes('Authentication token required') ||
        error.response?.status === 401
      ) {
        console.warn('Token expired or invalid - clearing session');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login/register page
        if (currentPath !== '/login' && currentPath !== '/register') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    }
    
    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = error.response?.data?.message || 'Too many requests. Please try again later.';
      error.userMessage = retryAfter 
        ? `${message} Retry after ${retryAfter} seconds.`
        : message;
    }
    
    // Add user-friendly error messages
    if (!error.userMessage) {
      if (error.response?.data?.message) {
        error.userMessage = error.response.data.message;
      } else if (error.message) {
        error.userMessage = error.message;
      } else {
        error.userMessage = 'An unexpected error occurred. Please try again.';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

