import express from 'express';
import { authenticateToken, requireOwner } from '../middleware/auth.js';
import { getMongoDB } from '../config/database.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// All owner routes require authentication and property owner role
router.use(authenticateToken);
router.use(requireOwner);

// Get owner dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const db = await getMongoDB();
    
    const [hotels, cars] = await Promise.all([
      db.collection('hotels').countDocuments({ ownerId }),
      db.collection('cars').countDocuments({ ownerId })
    ]);
    
    res.json({
      stats: {
        totalProperties: hotels + cars,
        totalHotels: hotels,
        totalCars: cars,
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching owner dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get owner's hotels
router.get('/hotels', async (req, res) => {
  try {
    const ownerId = req.user.id;
    logger.info('=== OWNER HOTELS REQUEST ===');
    logger.info('Owner ID:', ownerId);
    
    const db = await getMongoDB();
    const hotelsCollection = db.collection('hotels');
    
    const hotels = await hotelsCollection.find({ ownerId }).toArray();
    
    logger.info(`Owner ${ownerId} has ${hotels.length} hotels`);
    logger.info('Hotels:', hotels.map(h => ({ id: h.id, name: h.name })));
    
    const response = { 
      items: hotels,
      pagination: {
        totalItems: hotels.length,
        page: 1,
        pageSize: hotels.length
      }
    };
    
    logger.info('Sending response:', JSON.stringify(response).substring(0, 200));
    res.json(response);
  } catch (error) {
    logger.error('Error fetching owner hotels:', error);
    res.status(500).json({ code: 'ERROR', message: error.message });
  }
});

// Get single hotel
router.get('/hotels/:hotelId', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { hotelId } = req.params;
    
    const db = await getMongoDB();
    const hotelsCollection = db.collection('hotels');
    
    const hotel = await hotelsCollection.findOne({ _id: hotelId, ownerId });
    
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found or you do not own this hotel' });
    }
    
    res.json({ code: 'SUCCESS', data: hotel });
  } catch (error) {
    logger.error('Error fetching hotel:', error);
    res.status(500).json({ error: 'Failed to fetch hotel' });
  }
});

// Get owner's cars
router.get('/cars', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const db = await getMongoDB();
    const carsCollection = db.collection('cars');
    
    const cars = await carsCollection.find({ ownerId }).toArray();
    
    logger.info(`Owner ${ownerId} has ${cars.length} cars`);
    
    res.json({ 
      items: cars,
      pagination: {
        totalItems: cars.length,
        page: 1,
        pageSize: cars.length
      }
    });
  } catch (error) {
    logger.error('Error fetching owner cars:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

// Get single car
router.get('/cars/:carId', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { carId } = req.params;
    
    const db = await getMongoDB();
    const carsCollection = db.collection('cars');
    
    const car = await carsCollection.findOne({ _id: carId, ownerId });
    
    if (!car) {
      return res.status(404).json({ error: 'Car not found or you do not own this car' });
    }
    
    res.json({ code: 'SUCCESS', data: car });
  } catch (error) {
    logger.error('Error fetching car:', error);
    res.status(500).json({ error: 'Failed to fetch car' });
  }
});

// Add new hotel
router.post('/hotels', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const db = await getMongoDB();
    const hotelsCollection = db.collection('hotels');
    
    // Generate hotel ID
    const hotelId = `HT-${Date.now()}`;
    
    const hotel = {
      _id: hotelId,
      id: hotelId,
      ...req.body,
      ownerId,
      status: 'active', // Owners can directly publish their hotels
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await hotelsCollection.insertOne(hotel);
    
    logger.info(`Owner ${ownerId} created hotel: ${hotelId}`);
    
    res.status(201).json({ 
      code: 'SUCCESS',
      message: 'Hotel created successfully', 
      data: hotel 
    });
  } catch (error) {
    logger.error('Error creating hotel:', error);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
});

// Update hotel
router.put('/hotels/:hotelId', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { hotelId } = req.params;
    const db = await getMongoDB();
    const hotelsCollection = db.collection('hotels');
    
    // Verify ownership
    const hotel = await hotelsCollection.findOne({ _id: hotelId, ownerId });
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found or you do not own this hotel' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };
    
    // Don't allow changing ownerId or createdAt
    delete updateData.ownerId;
    delete updateData.createdAt;
    delete updateData._id;
    delete updateData.id;
    
    await hotelsCollection.updateOne(
      { _id: hotelId },
      { $set: updateData }
    );
    
    logger.info(`Owner ${ownerId} updated hotel: ${hotelId}`);
    
    res.json({ 
      code: 'SUCCESS',
      message: 'Hotel updated successfully' 
    });
  } catch (error) {
    logger.error('Error updating hotel:', error);
    res.status(500).json({ error: 'Failed to update hotel' });
  }
});

// Add new car
router.post('/cars', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const db = await getMongoDB();
    const carsCollection = db.collection('cars');
    
    // Generate car ID
    const carId = `CR-${Date.now()}`;
    
    const car = {
      _id: carId,
      id: carId,
      ...req.body,
      ownerId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await carsCollection.insertOne(car);
    
    logger.info(`Owner ${ownerId} created car: ${carId}`);
    
    res.status(201).json({ 
      code: 'SUCCESS',
      message: 'Car created successfully', 
      data: car 
    });
  } catch (error) {
    logger.error('Error creating car:', error);
    res.status(500).json({ error: 'Failed to create car' });
  }
});

// Update car
router.put('/cars/:carId', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { carId } = req.params;
    const db = await getMongoDB();
    const carsCollection = db.collection('cars');
    
    // Verify ownership
    const car = await carsCollection.findOne({ _id: carId, ownerId });
    if (!car) {
      return res.status(404).json({ error: 'Car not found or you do not own this car' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };
    
    // Don't allow changing ownerId or createdAt
    delete updateData.ownerId;
    delete updateData.createdAt;
    delete updateData._id;
    delete updateData.id;
    
    await carsCollection.updateOne(
      { _id: carId },
      { $set: updateData }
    );
    
    logger.info(`Owner ${ownerId} updated car: ${carId}`);
    
    res.json({ 
      code: 'SUCCESS',
      message: 'Car updated successfully' 
    });
  } catch (error) {
    logger.error('Error updating car:', error);
    res.status(500).json({ error: 'Failed to update car' });
  }
});

// Update hotel status (snooze, unlist, activate)
router.patch('/hotels/:hotelId/status', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { hotelId } = req.params;
    const { status } = req.body; // 'active', 'snoozed', 'unlisted'
    
    const db = await getMongoDB();
    const hotelsCollection = db.collection('hotels');
    
    // Verify ownership
    const hotel = await hotelsCollection.findOne({ _id: hotelId, ownerId });
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found or you do not own this hotel' });
    }
    
    await hotelsCollection.updateOne(
      { _id: hotelId },
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          ...(status === 'snoozed' && { snoozedAt: new Date() })
        } 
      }
    );
    
    logger.info(`Owner ${ownerId} updated hotel ${hotelId} status to: ${status}`);
    
    res.json({ 
      code: 'SUCCESS',
      message: `Hotel ${status === 'snoozed' ? 'snoozed' : status === 'unlisted' ? 'unlisted' : 'activated'} successfully` 
    });
  } catch (error) {
    logger.error('Error updating hotel status:', error);
    res.status(500).json({ error: 'Failed to update hotel status' });
  }
});

// Update car status (snooze, unlist, activate)
router.patch('/cars/:carId/status', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { carId } = req.params;
    const { status } = req.body;
    
    const db = await getMongoDB();
    const carsCollection = db.collection('cars');
    
    // Verify ownership
    const car = await carsCollection.findOne({ _id: carId, ownerId });
    if (!car) {
      return res.status(404).json({ error: 'Car not found or you do not own this car' });
    }
    
    await carsCollection.updateOne(
      { _id: carId },
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          ...(status === 'snoozed' && { snoozedAt: new Date() })
        } 
      }
    );
    
    logger.info(`Owner ${ownerId} updated car ${carId} status to: ${status}`);
    
    res.json({ 
      code: 'SUCCESS',
      message: `Car ${status === 'snoozed' ? 'snoozed' : status === 'unlisted' ? 'unlisted' : 'activated'} successfully` 
    });
  } catch (error) {
    logger.error('Error updating car status:', error);
    res.status(500).json({ error: 'Failed to update car status' });
  }
});

// Delete hotel (hard delete)
router.delete('/hotels/:hotelId', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { hotelId } = req.params;
    
    const db = await getMongoDB();
    const hotelsCollection = db.collection('hotels');
    
    // Verify ownership before deleting
    const result = await hotelsCollection.deleteOne({ _id: hotelId, ownerId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Hotel not found or you do not own this hotel' });
    }
    
    logger.info(`Owner ${ownerId} deleted hotel: ${hotelId}`);
    
    res.json({ 
      code: 'SUCCESS',
      message: 'Hotel deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting hotel:', error);
    res.status(500).json({ error: 'Failed to delete hotel' });
  }
});

// Delete car (hard delete)
router.delete('/cars/:carId', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { carId } = req.params;
    
    const db = await getMongoDB();
    const carsCollection = db.collection('cars');
    
    // Verify ownership before deleting
    const result = await carsCollection.deleteOne({ _id: carId, ownerId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Car not found or you do not own this car' });
    }
    
    logger.info(`Owner ${ownerId} deleted car: ${carId}`);
    
    res.json({ 
      code: 'SUCCESS',
      message: 'Car deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting car:', error);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

export default router;

