import session from 'express-session';
import { getRedisClient } from './database.js';
import { logger } from './logger.js';

/**
 * Custom Redis store for express-session using Redis v4 client
 */
class RedisStore extends session.Store {
  constructor() {
    super();
    this.client = null;
  }

  async getClient() {
    if (!this.client) {
      // Sessions always use Redis, even if caching is disabled
      this.client = await getRedisClient(false); // false = not for cache (for sessions)
    }
    return this.client;
  }

  async get(sid, callback) {
    try {
      const client = await this.getClient();
      const key = `session:${sid}`;
      const data = await client.get(key);

      if (!data) {
        return callback(null, null);
      }

      const session = JSON.parse(data);
      callback(null, session);
    } catch (error) {
      logger.error('Redis session get error:', error);
      callback(error);
    }
  }

  async set(sid, session, callback) {
    try {
      const client = await this.getClient();
      const key = `session:${sid}`;
      const ttl = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
      const data = JSON.stringify(session);

      await client.setEx(key, ttl, data);
      callback(null);
    } catch (error) {
      logger.error('Redis session set error:', error);
      callback(error);
    }
  }

  async destroy(sid, callback) {
    try {
      const client = await this.getClient();
      const key = `session:${sid}`;
      await client.del(key);
      callback(null);
    } catch (error) {
      logger.error('Redis session destroy error:', error);
      callback(error);
    }
  }

  async touch(sid, session, callback) {
    try {
      const client = await this.getClient();
      const key = `session:${sid}`;
      const ttl = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : 86400;
      await client.expire(key, ttl);
      callback(null);
    } catch (error) {
      logger.error('Redis session touch error:', error);
      callback(error);
    }
  }

  async all(callback) {
    try {
      const client = await this.getClient();
      const keys = await client.keys('session:*');
      const sessions = [];

      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          sessions.push(JSON.parse(data));
        }
      }

      callback(null, sessions);
    } catch (error) {
      logger.error('Redis session all error:', error);
      callback(error);
    }
  }

  async length(callback) {
    try {
      const client = await this.getClient();
      const keys = await client.keys('session:*');
      callback(null, keys.length);
    } catch (error) {
      logger.error('Redis session length error:', error);
      callback(error);
    }
  }

  async clear(callback) {
    try {
      const client = await this.getClient();
      const keys = await client.keys('session:*');
      if (keys.length > 0) {
        await client.del(keys);
      }
      callback(null);
    } catch (error) {
      logger.error('Redis session clear error:', error);
      callback(error);
    }
  }
}

export const createRedisStore = () => {
  return new RedisStore();
};

