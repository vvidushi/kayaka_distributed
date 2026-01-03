import { v4 as uuidv4 } from 'uuid';
import { getPostgresPool } from '../config/database.js';
import { logger } from '../config/logger.js';

export const createReview = async ({ userId, listingType, listingId, rating, title, body }) => {
  const pool = getPostgresPool();
  const id = uuidv4();

  const result = await pool.query(
    `INSERT INTO reviews (id, user_id, listing_type, listing_id, rating, title, body, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [id, userId, listingType, listingId, rating, title || null, body || null]
  );

  logger.info(`Review created: ${id} for ${listingType}:${listingId} by ${userId}`);
  return result.rows[0];
};

export const listReviews = async (filters = {}) => {
  const pool = getPostgresPool();
  const {
    listingType,
    listingId,
    userId,
    page = 1,
    pageSize = 25,
  } = filters;

  let query = 'SELECT * FROM reviews WHERE 1=1';
  const params = [];
  let idx = 1;

  if (listingType) {
    query += ` AND listing_type = $${idx++}`;
    params.push(listingType);
  }
  if (listingId) {
    query += ` AND listing_id = $${idx++}`;
    params.push(listingId);
  }
  if (userId) {
    query += ` AND user_id = $${idx++}`;
    params.push(userId);
  }

  const limit = parseInt(pageSize, 10);
  const offset = (parseInt(page, 10) - 1) * limit;

  const dataQuery = `${query} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
  const dataParams = [...params, limit, offset];

  const [dataResult, countResult] = await Promise.all([
    pool.query(dataQuery, dataParams),
    pool.query(`SELECT COUNT(*) AS total FROM (${query}) AS sub`, params),
  ]);

  const totalItems = parseInt(countResult.rows[0].total, 10);

  return {
    items: dataResult.rows,
    pagination: {
      page: parseInt(page, 10),
      pageSize: limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  };
};
