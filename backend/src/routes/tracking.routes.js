import express from 'express';
import { getMongoDB } from '../config/database.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// Track click/view events (no auth required - can track anonymous users too)
router.post('/click', async (req, res) => {
  try {
    const { listingId, page, section, action = 'click', metadata = {} } = req.body;
    
    if (!listingId && !page) {
      return res.status(400).json({ 
        code: 'INVALID_REQUEST',
        message: 'Either listingId or page is required' 
      });
    }

    const db = await getMongoDB();
    const clickLogsCollection = db.collection('clicklogs');
    
    const clickLog = {
      userId: req.user?.id || null,
      listingId: listingId || null,
      page: page || 'unknown',
      section: section || null,
      action,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await clickLogsCollection.insertOne(clickLog);
    
    logger.info('Click tracked:', { listingId, page, action, userId: req.user?.id || 'anonymous' });
    
    res.status(201).json({ 
      code: 'SUCCESS',
      message: 'Click logged successfully' 
    });
  } catch (error) {
    logger.error('Error tracking click:', error);
    // Don't fail the request even if tracking fails
    res.status(200).json({ 
      code: 'SUCCESS',
      message: 'Request processed' 
    });
  }
});

export default router;

