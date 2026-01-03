import { getRedisClient } from '../config/database.js';
import { logger } from '../config/logger.js';
import crypto from 'crypto';

// Cache configuration from environment
// Default: disabled (CACHE_ENABLED=false)
// Set CACHE_ENABLED=true to enable caching
const CACHE_ENABLED = process.env.CACHE_ENABLED === 'true';
const CACHE_TTL_LISTING = parseInt(process.env.CACHE_TTL_LISTING || '300', 10); // 5 minutes
const CACHE_TTL_SEARCH = parseInt(process.env.CACHE_TTL_SEARCH || '60', 10); // 1 minute
const CACHE_TTL_USER = parseInt(process.env.CACHE_TTL_USER || '600', 10); // 10 minutes

const DEFAULT_TTL = {
  LISTING: CACHE_TTL_LISTING,
  SEARCH_RESULT: CACHE_TTL_SEARCH,
  USER_PROFILE: CACHE_TTL_USER,
};

/**
 * Check if caching is enabled
 */
export const isCacheEnabled = () => CACHE_ENABLED;

/**
 * Generate cache key
 */
export const generateCacheKey = (prefix, ...parts) => {
  const key = parts.join(':');
  return `${prefix}:${key}`;
};

/**
 * Generate hash for search criteria
 */
export const hashSearchCriteria = (criteria) => {
  const str = JSON.stringify(criteria);
  return crypto.createHash('md5').update(str).digest('hex');
};

/**
 * Get cached value
 */
export const getCached = async (key) => {
  if (!CACHE_ENABLED) {
    logger.debug('Cache disabled, skipping get');
    return null;
  }

  try {
    const redis = await getRedisClient(true); // true = for cache operations
    if (!redis) {
      logger.debug('Redis client not available (cache disabled or connection failed)');
      return null;
    }

    const cached = await redis.get(key);

    if (cached) {
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(cached);
    }

    logger.debug(`Cache miss: ${key}`);
    return null;
  } catch (error) {
    logger.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Set cached value with TTL
 */
export const setCached = async (key, value, ttlSeconds = DEFAULT_TTL.LISTING) => {
  if (!CACHE_ENABLED) {
    logger.debug('Cache disabled, skipping set');
    return;
  }

  try {
    const redis = await getRedisClient(true); // true = for cache operations
    if (!redis) {
      logger.debug('Redis client not available (cache disabled or connection failed)');
      return;
    }

    await redis.setEx(key, ttlSeconds, JSON.stringify(value));
    logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    logger.error(`Error setting cache for key ${key}:`, error);
  }
};

/**
 * Delete cached value
 */
export const deleteCached = async (key) => {
  if (!CACHE_ENABLED) {
    logger.debug('Cache disabled, skipping delete');
    return;
  }

  try {
    const redis = await getRedisClient(true); // true = for cache operations
    if (!redis) {
      logger.debug('Redis client not available (cache disabled or connection failed)');
      return;
    }

    await redis.del(key);
    logger.debug(`Cache deleted: ${key}`);
  } catch (error) {
    logger.error(`Error deleting cache for key ${key}:`, error);
  }
};

/**
 * Delete cached values by pattern
 */
export const deleteCachedByPattern = async (pattern) => {
  if (!CACHE_ENABLED) {
    logger.debug('Cache disabled, skipping pattern delete');
    return;
  }

  try {
    const redis = await getRedisClient(true); // true = for cache operations
    if (!redis) {
      logger.debug('Redis client not available (cache disabled or connection failed)');
      return;
    }

    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(keys);
      logger.debug(`Cache deleted ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Error deleting cache by pattern ${pattern}:`, error);
  }
};

/**
 * Get or set cached value
 */
export const getOrSetCached = async (key, fetchFn, ttlSeconds = DEFAULT_TTL.LISTING) => {
  const cached = await getCached(key);

  if (cached !== null) {
    return cached;
  }

  const value = await fetchFn();
  await setCached(key, value, ttlSeconds);
  return value;
};

/**
 * Cache listing by type and ID
 */
export const cacheListing = async (type, id, listing, ttlSeconds = DEFAULT_TTL.LISTING) => {
  const key = generateCacheKey('listing', type, id);
  await setCached(key, listing, ttlSeconds);
};

/**
 * Get cached listing
 */
export const getCachedListing = async (type, id) => {
  const key = generateCacheKey('listing', type, id);
  return await getCached(key);
};

/**
 * Cache search results
 */
export const cacheSearchResults = async (type, criteria, results, ttlSeconds = DEFAULT_TTL.SEARCH_RESULT) => {
  const hash = hashSearchCriteria(criteria);
  const key = generateCacheKey('search', type, hash);
  await setCached(key, results, ttlSeconds);
};

/**
 * Get cached search results
 */
export const getCachedSearchResults = async (type, criteria) => {
  const hash = hashSearchCriteria(criteria);
  const key = generateCacheKey('search', type, hash);
  return await getCached(key);
};

/**
 * Invalidate listing cache
 */
export const invalidateListingCache = async (type, id) => {
  const key = generateCacheKey('listing', type, id);
  await deleteCached(key);

  const searchPattern = generateCacheKey('search', type, '*');
  await deleteCachedByPattern(searchPattern);
};

/**
 * Cache user profile
 */
export const cacheUserProfile = async (userId, profile, ttlSeconds = DEFAULT_TTL.USER_PROFILE) => {
  const key = generateCacheKey('user', 'profile', userId);
  await setCached(key, profile, ttlSeconds);
};

/**
 * Get cached user profile
 */
export const getCachedUserProfile = async (userId) => {
  const key = generateCacheKey('user', 'profile', userId);
  return await getCached(key);
};

/**
 * Invalidate user profile cache
 */
export const invalidateUserProfileCache = async (userId) => {
  const key = generateCacheKey('user', 'profile', userId);
  await deleteCached(key);
};

