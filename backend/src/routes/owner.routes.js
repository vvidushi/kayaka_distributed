import express from 'express';
import { authenticateToken, requireOwner } from '../middleware/auth.js';
import { getMongoDB, getPostgresPool } from '../config/database.js';
import { logger } from '../config/logger.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// All owner routes require authentication and property owner role
router.use(authenticateToken);
router.use(requireOwner);

// Get owner dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const ownerEmail = req.user.email;
    const db = await getMongoDB();
    
    // Get property IDs owned by this owner
    const [hotelDocs, carDocs] = await Promise.all([
      db.collection('hotels').find({ ownerId }).toArray(),
      db.collection('cars').find({ ownerId }).toArray()
    ]);
    
    const hotelIds = hotelDocs.map(h => h.id || h._id);
    const carIds = carDocs.map(c => c.id || c._id);
    
    // Get bookings for owner's properties from PostgreSQL
    const pool = getPostgresPool();
    
    // Get all bookings for owner's properties (not just confirmed)
    let bookingsQuery = `
      SELECT b.status, b.price_amount
      FROM bookings b
      WHERE (
        (b.booking_type = 'hotel' AND (b.itinerary->>'hotelId') = ANY($1::text[]))
        OR
        (b.booking_type = 'car' AND (b.itinerary->>'carId') = ANY($2::text[]))
      )
    `;
    
    const allBookings = await pool.query(bookingsQuery, [hotelIds, carIds]);
    
    // Count bookings by status
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      failed: 0
    };
    
    let totalRevenue = 0;
    
    allBookings.rows.forEach((booking) => {
      const status = booking.status?.toLowerCase();
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
      // Only count revenue from confirmed bookings
      if (status === 'confirmed' && booking.price_amount) {
        totalRevenue += parseFloat(booking.price_amount);
      }
    });
    
    const totalBookings = allBookings.rows.length;
    
    res.json({
      stats: {
        totalProperties: hotelDocs.length + carDocs.length,
        totalHotels: hotelDocs.length,
        totalCars: carDocs.length,
        totalBookings: totalBookings,
        bookingsByStatus: {
          pending: statusCounts.pending,
          confirmed: statusCounts.confirmed,
          cancelled: statusCounts.cancelled,
          completed: statusCounts.completed,
          failed: statusCounts.failed
        },
        totalRevenue: totalRevenue,
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

// Get owner's bookings
router.get('/bookings', async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { status, bookingType, limit = 50, offset = 0 } = req.query;
    
    const db = await getMongoDB();
    const pool = getPostgresPool();
    
    // Get property IDs owned by this owner
    const [hotelDocs, carDocs] = await Promise.all([
      db.collection('hotels').find({ ownerId }).toArray(),
      db.collection('cars').find({ ownerId }).toArray()
    ]);
    
    const hotelIds = hotelDocs.map(h => (h.id || h._id).toString());
    const carIds = carDocs.map(c => (c.id || c._id).toString());
    
    if (hotelIds.length === 0 && carIds.length === 0) {
      return res.json({
        items: [],
        pagination: {
          total: 0,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
        }
      });
    }
    
    // Build query to find bookings for owner's properties
    let query = `
      SELECT b.*
      FROM bookings b
      WHERE (
        (b.booking_type = 'hotel' AND (b.itinerary->>'hotelId') = ANY($1::text[]))
        OR
        (b.booking_type = 'car' AND (b.itinerary->>'carId') = ANY($2::text[]))
      )
    `;
    const params = [hotelIds, carIds];
    let paramIndex = 3;
    
    if (status) {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (bookingType) {
      query += ` AND b.booking_type = $${paramIndex}`;
      params.push(bookingType);
      paramIndex++;
    }
    
    const baseQuery = query;
    const limitValue = parseInt(limit, 10);
    const offsetValue = parseInt(offset, 10);
    const queryWithPaging = `${baseQuery} ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitValue, offsetValue);
    
    // Get bookings and count
    const [result, countResult] = await Promise.all([
      pool.query(queryWithPaging, params),
      pool.query(
        `SELECT COUNT(*) AS total FROM (${baseQuery}) as sub`,
        params.slice(0, params.length - 2)
      ),
    ]);
    
    const totalItems = parseInt(countResult.rows[0].total, 10);
    
    // Get user info for bookings
    const userIds = [...new Set(result.rows.map((b) => b.user_id).filter(Boolean))];
    const usersMap = {};
    if (userIds.length > 0) {
      const usersCollection = db.collection('users');
      const objectIds = userIds.map(id => {
        try {
          return typeof id === 'string' ? new ObjectId(id) : id;
        } catch {
          return null;
        }
      }).filter(Boolean);
      
      if (objectIds.length > 0) {
        const users = await usersCollection
          .find({ _id: { $in: objectIds } })
          .project({ email: 1, firstName: 1, lastName: 1 })
          .toArray();
        
        users.forEach((u) => {
          usersMap[u._id.toString()] = {
            id: u._id.toString(),
            email: u.email || null,
            firstName: u.firstName || null,
            lastName: u.lastName || null,
          };
        });
      }
    }
    
    const bookings = result.rows.map((booking) => ({
      id: booking.id,
      userId: booking.user_id,
      user: usersMap[booking.user_id] || null,
      bookingType: booking.booking_type,
      status: booking.status,
      price: {
        amount: parseFloat(booking.price_amount),
        currency: booking.price_currency,
      },
      itinerary: booking.itinerary ? (typeof booking.itinerary === 'string' ? JSON.parse(booking.itinerary) : booking.itinerary) : null,
      metadata: booking.metadata ? (typeof booking.metadata === 'string' ? JSON.parse(booking.metadata) : booking.metadata) : {},
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    }));
    
    res.json({
      items: bookings,
      pagination: {
        total: totalItems,
        limit: limitValue,
        offset: offsetValue,
      }
    });
  } catch (error) {
    logger.error('Error fetching owner bookings:', error);
    res.status(500).json({ code: 'ERROR', message: error.message });
  }
});

export default router;

