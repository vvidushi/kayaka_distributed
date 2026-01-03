import * as imageService from '../services/image.service.js';
import { logger } from '../config/logger.js';

export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'NO_FILE',
        message: 'No image file provided',
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const requestedProfileId = req.body.profileId || userId;
    
    if (requestedProfileId !== userId && req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You can only upload images for your own profile',
      });
    }

    const result = await imageService.uploadProfileImage(req.file, requestedProfileId);
    res.status(201).json({
      code: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    logger.error('Profile image upload error:', error);
    next(error);
  }
};

export const uploadFlightImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'NO_FILE',
        message: 'No image file provided',
      });
    }

    const { flightId } = req.body;
    if (!flightId) {
      return res.status(400).json({
        code: 'MISSING_ID',
        message: 'Flight ID is required',
      });
    }

    const result = await imageService.uploadFlightImage(req.file, flightId);
    res.status(201).json({
      code: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    logger.error('Flight image upload error:', error);
    next(error);
  }
};

export const uploadHotelImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'NO_FILE',
        message: 'No image file provided',
      });
    }

    const { hotelId } = req.body;
    if (!hotelId) {
      return res.status(400).json({
        code: 'MISSING_ID',
        message: 'Hotel ID is required',
      });
    }

    const result = await imageService.uploadHotelImage(req.file, hotelId);
    res.status(201).json({
      code: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    logger.error('Hotel image upload error:', error);
    next(error);
  }
};

export const uploadCarImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        code: 'NO_FILE',
        message: 'No image file provided',
      });
    }

    const { carId } = req.body;
    if (!carId) {
      return res.status(400).json({
        code: 'MISSING_ID',
        message: 'Car ID is required',
      });
    }

    const result = await imageService.uploadCarImage(req.file, carId);
    res.status(201).json({
      code: 'SUCCESS',
      data: result,
    });
  } catch (error) {
    logger.error('Car image upload error:', error);
    next(error);
  }
};

export const deleteImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const imageUrl = req.body.imageUrl || req.query.imageUrl;

    if (!imageUrl) {
      return res.status(400).json({
        code: 'NO_URL',
        message: 'Image URL is required',
      });
    }

    await imageService.deleteImage(imageUrl);
    res.status(204).send();
  } catch (error) {
    logger.error('Image deletion error:', error);
    next(error);
  }
};

export const deleteEntityImages = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;

    if (!entityType || !entityId) {
      return res.status(400).json({
        code: 'MISSING_PARAMS',
        message: 'Entity type and ID are required',
      });
    }

    await imageService.deleteEntityImages(entityType, entityId);
    res.status(204).send();
  } catch (error) {
    logger.error('Entity images deletion error:', error);
    next(error);
  }
};
