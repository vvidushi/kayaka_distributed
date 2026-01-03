import { getMongoDB, getPostgresPool } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Get clicks per page analytics
 */
export const getClicksPerPage = async (filters = {}) => {
  try {
    const db = await getMongoDB();
    const clickLogsCollection = db.collection('clicklogs');
    
    const { startDate, endDate, action = 'click' } = filters;
    
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (action) query.action = action;

    const clicks = await clickLogsCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$page',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          page: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: clicks.map(item => ({
        page: item.page || 'unknown',
        clicks: item.count,
        uniqueUsers: item.uniqueUsers
      }))
    };
  } catch (error) {
    logger.error('Error getting clicks per page:', error);
    throw error;
  }
};

/**
 * Get property/listing clicks analytics
 */
export const getPropertyClicks = async (filters = {}) => {
  try {
    const db = await getMongoDB();
    const clickLogsCollection = db.collection('clicklogs');
    
    const { startDate, endDate, listingType, limit = 20 } = filters;
    
    const query = { listingId: { $exists: true, $ne: null } };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (listingType) {
      // Extract listing type from listingId prefix (e.g., "FL-", "HT-", "CR-")
      const prefix = listingType === 'flight' ? 'FL-' : listingType === 'hotel' ? 'HT-' : 'CR-';
      query.listingId = { $regex: `^${prefix}` };
    }

    const clicks = await clickLogsCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$listingId',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          pages: { $addToSet: '$page' }
        }
      },
      {
        $project: {
          listingId: '$_id',
          clicks: '$count',
          uniqueUsers: { $size: '$uniqueUsers' },
          pages: { $size: '$pages' }
        }
      },
      { $sort: { clicks: -1 } },
      { $limit: limit }
    ]).toArray();

    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: clicks.map(item => ({
        listingId: item.listingId,
        clicks: item.clicks,
        uniqueUsers: item.uniqueUsers,
        pagesViewed: item.pages
      }))
    };
  } catch (error) {
    logger.error('Error getting property clicks:', error);
    throw error;
  }
};

/**
 * Get least seen sections/areas
 */
export const getLeastSeenSections = async (filters = {}) => {
  try {
    const db = await getMongoDB();
    const clickLogsCollection = db.collection('clicklogs');
    
    const { startDate, endDate, page } = filters;
    
    const query = { section: { $exists: true, $ne: null } };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (page) query.page = page;

    const sections = await clickLogsCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: { page: '$page', section: '$section' },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          page: '$_id.page',
          section: '$_id.section',
          views: '$count',
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { views: 1 } } // Sort ascending to get least seen first
    ]).toArray();

    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: sections.map(item => ({
        page: item.page,
        section: item.section,
        views: item.views,
        uniqueUsers: item.uniqueUsers
      }))
    };
  } catch (error) {
    logger.error('Error getting least seen sections:', error);
    throw error;
  }
};

/**
 * Get reviews on properties analytics
 */
export const getPropertyReviews = async (filters = {}) => {
  const pool = getPostgresPool();
  
  try {
    const { listingType, listingId, startDate, endDate, limit = 50 } = filters;
    
    let query = `
      SELECT 
        listing_id,
        listing_type,
        COUNT(*) as review_count,
        AVG(rating) as avg_rating,
        MIN(rating) as min_rating,
        MAX(rating) as max_rating
      FROM reviews
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (listingType) {
      query += ` AND listing_type = $${paramIndex++}`;
      params.push(listingType);
    }

    if (listingId) {
      query += ` AND listing_id = $${paramIndex++}`;
      params.push(listingId);
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` GROUP BY listing_id, listing_type ORDER BY review_count DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: result.rows.map(row => ({
        listingId: row.listing_id,
        listingType: row.listing_type,
        reviewCount: parseInt(row.review_count, 10),
        avgRating: parseFloat(row.avg_rating) || 0,
        minRating: parseInt(row.min_rating, 10) || 0,
        maxRating: parseInt(row.max_rating, 10) || 0
      }))
    };
  } catch (error) {
    logger.error('Error getting property reviews:', error);
    throw error;
  }
};

/**
 * Get user trace for a specific user or cohort
 */
export const getUserTrace = async (filters = {}) => {
  const db = await getMongoDB();
  const tracesCollection = db.collection('user_traces');
  
  try {
    const { userId, cohort, limit = 100 } = filters;
    
    const query = {};
    if (userId) query.userId = userId;
    if (cohort) query.cohort = cohort;

    const traces = await tracesCollection
      .find(query)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray();

    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: traces.map(trace => ({
        userId: trace.userId,
        cohort: trace.cohort,
        steps: trace.steps || [],
        stepCount: (trace.steps || []).length,
        createdAt: trace.createdAt,
        updatedAt: trace.updatedAt
      }))
    };
  } catch (error) {
    logger.error('Error getting user trace:', error);
    throw error;
  }
};

/**
 * Get cohort analysis
 */
export const getCohortAnalysis = async (filters = {}) => {
  const db = await getMongoDB();
  const tracesCollection = db.collection('user_traces');
  
  try {
    const { startDate, endDate } = filters;
    
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const cohorts = await tracesCollection.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$cohort',
          userCount: { $addToSet: '$userId' },
          totalSteps: { $sum: { $size: { $ifNull: ['$steps', []] } } },
          avgStepsPerUser: { $avg: { $size: { $ifNull: ['$steps', []] } } }
        }
      },
      {
        $project: {
          cohort: '$_id',
          userCount: { $size: '$userCount' },
          totalSteps: 1,
          avgStepsPerUser: { $round: ['$avgStepsPerUser', 2] }
        }
      },
      { $sort: { cohort: -1 } }
    ]).toArray();

    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: cohorts
    };
  } catch (error) {
    logger.error('Error getting cohort analysis:', error);
    throw error;
  }
};

/**
 * Get bidding/limited offers tracking (if implemented)
 * Note: This is a placeholder for future bidding functionality
 */
export const getBiddingTracking = async (filters = {}) => {
  const db = await getMongoDB();
  
  try {
    // Check if deals collection exists and has bidding data
    const dealsCollection = db.collection('deals');
    
    const { listingType, listingId, startDate, endDate } = filters;
    
    const query = { isDeal: true };
    if (listingType) query.listingType = listingType;
    if (listingId) query.listingId = listingId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const deals = await dealsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: deals.map(deal => ({
        listingId: deal.listingId || deal._id,
        listingType: deal.listingType || 'unknown',
        isDeal: deal.isDeal || false,
        savingsPercent: deal.savingsPercent || 0,
        createdAt: deal.createdAt,
        expiresAt: deal.expiresAt
      })),
      note: 'Bidding/limited offers tracking - shows deals and limited availability items'
    };
  } catch (error) {
    logger.error('Error getting bidding tracking:', error);
    // Return empty result if deals collection doesn't exist
    return {
      generatedAt: new Date().toISOString(),
      filters,
      items: [],
      note: 'Bidding/limited offers feature not fully implemented'
    };
  }
};

