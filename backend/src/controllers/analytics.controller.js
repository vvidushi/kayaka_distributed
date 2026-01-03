import { logger } from '../config/logger.js';
import * as analyticsService from '../services/analytics.service.js';

export const getUserTraces = async (req, res, next) => {
  try {
    const { userId, cohort, limit } = req.query;
    const result = await analyticsService.getUserTrace({
      userId,
      cohort,
      limit: limit ? parseInt(limit, 10) : undefined
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in getUserTraces:', error);
    next(error);
  }
};

export const getClicksPerPage = async (req, res, next) => {
  try {
    const { startDate, endDate, action } = req.query;
    const result = await analyticsService.getClicksPerPage({
      startDate,
      endDate,
      action
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in getClicksPerPage:', error);
    next(error);
  }
};

export const getPropertyClicks = async (req, res, next) => {
  try {
    const { startDate, endDate, listingType, limit } = req.query;
    const user = req.user; // From auth middleware
    
    logger.info('=== getPropertyClicks ===');
    logger.info('User:', { id: user?.id, email: user?.email, profileType: user?.profileType, role: user?.role });
    
    // If user is an owner, filter to only their properties
    const ownerId = (user?.profileType === 'owner' || user?.profileType === 'property_owner') ? user.id : undefined;
    
    logger.info('Owner filter:', { ownerId, isOwner: !!ownerId });
    
    const result = await analyticsService.getPropertyClicks({
      startDate,
      endDate,
      listingType,
      limit: limit ? parseInt(limit, 10) : undefined,
      ownerId
    });
    
    logger.info('Result:', { itemCount: result.items?.length || 0 });
    
    res.json(result);
  } catch (error) {
    logger.error('Error in getPropertyClicks:', error);
    next(error);
  }
};

export const getLeastSeenSections = async (req, res, next) => {
  try {
    const { startDate, endDate, page } = req.query;
    const result = await analyticsService.getLeastSeenSections({
      startDate,
      endDate,
      page
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in getLeastSeenSections:', error);
    next(error);
  }
};

export const getPropertyReviews = async (req, res, next) => {
  try {
    const { listingType, listingId, startDate, endDate, limit } = req.query;
    const user = req.user; // From auth middleware
    
    logger.info('=== getPropertyReviews ===');
    logger.info('User:', { id: user?.id, email: user?.email, profileType: user?.profileType });
    
    // If user is an owner, filter to only their properties
    const ownerId = (user?.profileType === 'owner' || user?.profileType === 'property_owner') ? user.id : undefined;
    
    logger.info('Owner filter:', { ownerId, isOwner: !!ownerId });
    
    const result = await analyticsService.getPropertyReviews({
      listingType,
      listingId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      ownerId
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in getPropertyReviews:', error);
    next(error);
  }
};

export const getCohortAnalysis = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await analyticsService.getCohortAnalysis({
      startDate,
      endDate
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in getCohortAnalysis:', error);
    next(error);
  }
};

export const getBiddingTracking = async (req, res, next) => {
  try {
    const { listingType, listingId, startDate, endDate } = req.query;
    const result = await analyticsService.getBiddingTracking({
      listingType,
      listingId,
      startDate,
      endDate
    });
    res.json(result);
  } catch (error) {
    logger.error('Error in getBiddingTracking:', error);
    next(error);
  }
};

