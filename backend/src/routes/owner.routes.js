import express from 'express';
import { authenticateToken, requireOwner } from '../middleware/auth.js';
import { getMongoDB } from '../config/database.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// All owner routes require authentication and property owner role
router.use(authenticateToken);
router.use(requireOwner);

// Get owner's booking requests (bookings for their properties)
router.get('/bookings', async (req, res) => {
  try {
    const ownerId = req.user.id;
    logger.info('=== OWNER BOOKING REQUESTS ===');
    logger.info('Owner ID:', ownerId);
    
    const db = await getMongoDB();
    const { getPostgresPool } = await import('../config/database.js');
    const pool = getPostgresPool();
    
    // Get owner's property IDs from MongoDB
    const hotelsCollection = db.collection('hotels');
    const carsCollection = db.collection('cars');
    
    const [ownedHotels, ownedCars] = await Promise.all([
      hotelsCollection.find({ ownerId }).toArray(),
      carsCollection.find({ ownerId }).toArray()
    ]);
    
    const hotelIds = ownedHotels.map(h => h.id || h._id);
    const carIds = ownedCars.map(c => c.id || c._id);
    
    logger.info('Owner properties:', { hotels: hotelIds.length, cars: carIds.length });
    
    if (hotelIds.length === 0 && carIds.length === 0) {
      return res.json({ items: [], pagination: { totalItems: 0 } });
    }
    
    // Get bookings from PostgreSQL that reference these properties
    const result = await pool.query(
      `SELECT b.*
       FROM bookings b
       WHERE b.booking_type IN ('hotel', 'car')
       AND b.status IN ('PENDING', 'CONFIRMED', 'CANCELLED')
       ORDER BY b.created_at DESC
       LIMIT 100`
    );
    
    // Filter bookings to only include owner's properties
    const ownerBookings = result.rows.filter(booking => {
      try {
        const itinerary = typeof booking.itinerary === 'string' 
          ? JSON.parse(booking.itinerary) 
          : booking.itinerary;
        
        const listingId = itinerary?.hotelId || itinerary?.carId;
        
        if (booking.booking_type === 'hotel') {
          return hotelIds.includes(listingId);
        } else if (booking.booking_type === 'car') {
          return carIds.includes(listingId);
        }
        return false;
      } catch (error) {
        logger.error('Error parsing booking itinerary:', error);
        return false;
      }
    });
    
    logger.info(`Found ${ownerBookings.length} bookings for owner's properties`);
    
    // Get user information from MongoDB
    const usersCollection = db.collection('users');
    const userIds = [...new Set(ownerBookings.map(b => b.user_id))];
    
    // Fetch users from MongoDB
    const { ObjectId } = await import('mongodb');
    const users = await usersCollection.find({
      _id: { $in: userIds.map(id => {
        try {
          return new ObjectId(id);
        } catch {
          return id;
        }
      })}
    }).toArray();
    
    // Create user map
    const userMap = {};
    users.forEach(user => {
      const id = user._id.toString();
      userMap[id] = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      };
    });
    
    // Format response with user data from MongoDB
    const items = ownerBookings.map(booking => {
      const user = userMap[booking.user_id] || {};
      return {
        id: booking.id,
        userId: booking.user_id,
        userEmail: user.email || 'Unknown',
        userName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.email || 'Unknown User',
        bookingType: booking.booking_type,
        status: booking.status,
        price: {
          amount: parseFloat(booking.price_amount),
          currency: booking.price_currency
        },
        itinerary: typeof booking.itinerary === 'string' 
          ? JSON.parse(booking.itinerary) 
          : booking.itinerary,
        metadata: typeof booking.metadata === 'string'
          ? JSON.parse(booking.metadata)
          : booking.metadata,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at
      };
    });
    
    res.json({ 
      items,
      pagination: {
        totalItems: items.length,
        page: 1,
        pageSize: items.length
      }
    });
  } catch (error) {
    logger.error('Error fetching owner bookings:', error);
    res.status(500).json({ error: 'Failed to fetch booking requests' });
  }
});

// Accept booking request (owner approves)
router.patch('/bookings/:bookingId/accept', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { bookingId } = req.params;
    
    logger.info(`Owner ${ownerId} accepting booking ${bookingId}`);
    
    const { getPostgresPool } = await import('../config/database.js');
    const pool = getPostgresPool();
    
    // Update booking status to CONFIRMED
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'CONFIRMED', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    logger.info(`Booking ${bookingId} confirmed by owner`);
    
    res.json({ 
      code: 'SUCCESS',
      message: 'Booking accepted successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    logger.error('Error accepting booking:', error);
    res.status(500).json({ error: 'Failed to accept booking' });
  }
});

// Reject/Cancel booking request (owner declines)
router.patch('/bookings/:bookingId/reject', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { bookingId } = req.params;
    const { reason } = req.body;
    
    logger.info(`Owner ${ownerId} rejecting booking ${bookingId}`);
    
    const { getPostgresPool } = await import('../config/database.js');
    const pool = getPostgresPool();
    
    // Update booking status to CANCELLED with rejection reason
    const metadata = reason ? JSON.stringify({ rejectionReason: reason }) : '{}';
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'CANCELLED', 
           updated_at = NOW(),
           metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
       WHERE id = $1
       RETURNING *`,
      [bookingId, metadata]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    logger.info(`Booking ${bookingId} rejected by owner`);
    
    res.json({ 
      code: 'SUCCESS',
      message: 'Booking rejected successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    logger.error('Error rejecting booking:', error);
    res.status(500).json({ error: 'Failed to reject booking' });
  }
});

// Get owner dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const ownerId = req.user.id;
    logger.info('=== OWNER DASHBOARD STATS REQUEST ===');
    logger.info('Owner ID:', ownerId);
    logger.info('User:', { id: req.user.id, email: req.user.email, profileType: req.user.profileType });
    
    const db = await getMongoDB();
    
    // Count documents with detailed logging
    const hotelsCollection = db.collection('hotels');
    const carsCollection = db.collection('cars');
    
    const [hotels, cars] = await Promise.all([
      hotelsCollection.countDocuments({ ownerId }),
      carsCollection.countDocuments({ ownerId })
    ]);
    
    logger.info(`Owner ${ownerId} has ${hotels} hotels and ${cars} cars`);
    
    // Also get sample documents to verify
    const sampleHotels = await hotelsCollection.find({ ownerId }).limit(3).toArray();
    const sampleCars = await carsCollection.find({ ownerId }).limit(3).toArray();
    
    logger.info('Sample hotels:', sampleHotels.map(h => ({ id: h.id, name: h.name, ownerId: h.ownerId })));
    logger.info('Sample cars:', sampleCars.map(c => ({ id: c.id, name: c.name, ownerId: c.ownerId })));
    
    const stats = {
      totalProperties: hotels + cars,
      totalHotels: hotels,
      totalCars: cars,
      totalBookings: 0,
      totalRevenue: 0,
      averageRating: 0
    };
    
    logger.info('Sending stats:', stats);
    
    res.json({ stats });
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

