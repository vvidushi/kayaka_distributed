import { getMongoDB } from '../config/database.js';
import { logger } from '../config/logger.js';

export const trackClick = (actionType = "click") => {
  return async (req, res, next) => {
    try {
      const db = await getMongoDB();
      const clickLogsCollection = db.collection('clicklogs');
      
      await clickLogsCollection.insertOne({
        userId: req.user?.id || null,
        page: req.body.page || req.query.page || "unknown",
        listingId: req.body.listingId || null,
        section: req.body.section || null,
        action: actionType,
        metadata: req.body.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      logger.warn("Click logging failed:", err.message);
    }

    next();
  };
};