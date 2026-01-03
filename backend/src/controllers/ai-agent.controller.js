import { logger } from '../config/logger.js';
import axios from 'axios';
import { searchBookings } from '../services/bookings.service.js';

const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://localhost:8000';

/**
 * Get user context (bookings, etc.) for authenticated users
 */
const getUserContext = async (userId) => {
  try {
    // Get user bookings
    const bookingsResult = await searchBookings({
      userId,
      limit: 10, // Get recent 10 bookings
      offset: 0,
    });

    const bookings = bookingsResult.items.map(booking => ({
      id: booking.id,
      type: booking.bookingType,
      status: booking.status,
      price: booking.price,
      itinerary: booking.itinerary,
      createdAt: booking.createdAt,
    }));

    return {
      bookings,
      bookingCount: bookingsResult.pagination.total,
    };
  } catch (error) {
    logger.error('Error fetching user context:', error);
    return {
      bookings: [],
      bookingCount: 0,
    };
  }
};

/**
 * Proxy request to AI-agent service
 */
const proxyRequest = async (req, res, method, path, requiresAuth = false, injectContext = false) => {
  try {
    const url = `${AI_AGENT_URL}${path}`;
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    };

    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      config.data = req.body;
    }

    // Add query parameters
    if (Object.keys(req.query).length > 0) {
      config.params = req.query;
    }

    // Inject user context if authenticated
    if (req.user) {
      const userId = req.user.id || req.user.userId;
      
      if (!config.data) config.data = {};
      config.data.user_id = userId;
      config.data.user_context = {
        email: req.user.email,
        profileType: req.user.profileType,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      };

      // Inject detailed context (bookings, etc.) if requested
      if (injectContext) {
        const userContext = await getUserContext(userId);
        config.data.user_context = {
          ...config.data.user_context,
          ...userContext,
        };
      }
    } else if (!requiresAuth) {
      // For non-authenticated users, provide generic context
      if (!config.data) config.data = {};
      config.data.context = {
        type: 'anonymous',
        availableServices: ['flights', 'hotels', 'cars'],
      };
    }

    logger.info(`Proxying ${method} ${path} to AI-agent service`);
    const response = await axios(config);
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    logger.error(`AI-agent proxy error for ${method} ${path}:`, error.message);
    
    if (error.response) {
      // Forward error response from AI-agent
      return res.status(error.response.status).json({
        error: error.response.data?.error || error.response.data?.detail || 'AI-agent service error',
        message: error.response.data?.message || error.message,
      });
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        error: 'AI-agent service unavailable',
        message: 'The AI concierge service is currently unavailable. Please try again later.',
      });
    } else {
      return res.status(500).json({
        error: 'Proxy error',
        message: error.message || 'Failed to communicate with AI-agent service',
      });
    }
  }
};

/**
 * Create a new chat session
 * POST /api/v1/ai-agent/sessions
 */
export const createSession = async (req, res) => {
  const path = '/api/v1/concierge/sessions';
  await proxyRequest(req, res, 'POST', path, false, true); // Inject context for session creation
};

/**
 * Get chat session
 * GET /api/v1/ai-agent/sessions/:sessionId
 */
export const getSession = async (req, res) => {
  const path = `/api/v1/concierge/sessions/${req.params.sessionId}`;
  await proxyRequest(req, res, 'GET', path, false);
};

/**
 * Send message in chat session
 * POST /api/v1/ai-agent/sessions/:sessionId/messages
 */
export const sendMessage = async (req, res) => {
  const path = `/api/v1/concierge/sessions/${req.params.sessionId}/messages`;
  await proxyRequest(req, res, 'POST', path, true, true); // Inject context for messages
};

/**
 * Get bundles
 * GET /api/v1/ai-agent/bundles
 */
export const getBundles = async (req, res) => {
  const path = '/api/v1/concierge/bundles';
  await proxyRequest(req, res, 'GET', path, true);
};

/**
 * Get bundle by ID
 * GET /api/v1/ai-agent/bundles/:bundleId
 */
export const getBundle = async (req, res) => {
  const path = `/api/v1/concierge/bundles/${req.params.bundleId}`;
  await proxyRequest(req, res, 'GET', path, false);
};

/**
 * Create watch
 * POST /api/v1/ai-agent/watches
 */
export const createWatch = async (req, res) => {
  const path = '/api/v1/concierge/watches';
  await proxyRequest(req, res, 'POST', path, true);
};

/**
 * List watches
 * GET /api/v1/ai-agent/watches
 */
export const listWatches = async (req, res) => {
  const path = '/api/v1/concierge/watches';
  await proxyRequest(req, res, 'GET', path, true);
};

/**
 * Execute database query
 * POST /api/v1/ai-agent/query
 */
export const executeQuery = async (req, res) => {
  const path = '/api/v1/concierge/query';
  await proxyRequest(req, res, 'POST', path, true);
};

/**
 * Get policy answer
 * POST /api/v1/ai-agent/policy
 */
export const getPolicyAnswer = async (req, res) => {
  const path = '/api/v1/concierge/policy';
  await proxyRequest(req, res, 'POST', path, false);
};

/**
 * Health check
 * GET /api/v1/ai-agent/health
 */
export const healthCheck = async (req, res) => {
  const path = '/health';
  await proxyRequest(req, res, 'GET', path, false);
};

