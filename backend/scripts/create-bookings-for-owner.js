#!/usr/bin/env node

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'kayak';

const createBookingsForOwnerProperties = async () => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const ownerId = '69359ff8cfd91c7ee1083908';
    const ownerEmail = 'OwnerTest@gmail.com';
    
    // Get owner's hotels
    const hotels = await db.collection('hotels').find({ ownerId }).toArray();
    
    console.log(`Found ${hotels.length} hotels for owner`);
    
    if (hotels.length === 0) {
      console.log('No hotels found for this owner');
      return;
    }
    
    const bookingsToCreate = [];
    
    // Create 1-2 bookings for each hotel
    for (const hotel of hotels) {
      // Past booking 1
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const checkIn1 = lastMonth.toISOString().split('T')[0];
      const checkOut1 = new Date(lastMonth.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const booking1 = {
        id: `BK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        userId: 'test-user-id',
        userEmail: 'testtrav@example.com',
        userName: 'Test Traveler',
        type: 'hotel',
        status: 'confirmed',
        paymentStatus: 'paid',
        ownerId: ownerId,
        ownerEmail: ownerEmail,
        itinerary: {
          hotelId: hotel.id || hotel._id,
          hotelName: hotel.name,
          city: hotel.city,
          state: hotel.state,
          checkInDate: checkIn1,
          checkOutDate: checkOut1,
          nights: 3,
          guests: 2,
          roomType: 'Standard Room'
        },
        price: {
          amount: hotel.pricePerNight * 3,
          currency: hotel.currency || 'USD',
          breakdown: {
            basePrice: hotel.pricePerNight * 3,
            taxes: hotel.pricePerNight * 3 * 0.1,
            fees: 0
          }
        },
        createdAt: lastMonth.toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      bookingsToCreate.push(booking1);
      
      // Past booking 2 (2 months ago)
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const checkIn2 = twoMonthsAgo.toISOString().split('T')[0];
      const checkOut2 = new Date(twoMonthsAgo.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const booking2 = {
        id: `BK-${Date.now() + 1}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        userId: 'test-user-id-2',
        userEmail: 'anothertraveler@example.com',
        userName: 'Another Traveler',
        type: 'hotel',
        status: 'confirmed',
        paymentStatus: 'paid',
        ownerId: ownerId,
        ownerEmail: ownerEmail,
        itinerary: {
          hotelId: hotel.id || hotel._id,
          hotelName: hotel.name,
          city: hotel.city,
          state: hotel.state,
          checkInDate: checkIn2,
          checkOutDate: checkOut2,
          nights: 2,
          guests: 1,
          roomType: 'Deluxe Room'
        },
        price: {
          amount: hotel.pricePerNight * 2,
          currency: hotel.currency || 'USD',
          breakdown: {
            basePrice: hotel.pricePerNight * 2,
            taxes: hotel.pricePerNight * 2 * 0.1,
            fees: 0
          }
        },
        createdAt: twoMonthsAgo.toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      bookingsToCreate.push(booking2);
    }
    
    // Get owner's cars
    const cars = await db.collection('cars').find({ ownerId }).toArray();
    console.log(`Found ${cars.length} cars for owner`);
    
    for (const car of cars) {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const pickupDate = lastMonth.toISOString().split('T')[0];
      const dropoffDate = new Date(lastMonth.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const carBooking = {
        id: `BK-${Date.now() + 2}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        userId: 'test-user-id',
        userEmail: 'testtrav@example.com',
        userName: 'Test Traveler',
        type: 'car',
        status: 'confirmed',
        paymentStatus: 'paid',
        ownerId: ownerId,
        ownerEmail: ownerEmail,
        itinerary: {
          carId: car.id || car._id,
          vendor: car.vendor,
          model: car.model,
          city: car.city,
          state: car.state,
          pickupDate: pickupDate,
          dropoffDate: dropoffDate,
          days: 5
        },
        price: {
          amount: car.pricePerDay * 5,
          currency: car.currency || 'USD',
          breakdown: {
            basePrice: car.pricePerDay * 5,
            taxes: car.pricePerDay * 5 * 0.1,
            fees: 0
          }
        },
        createdAt: lastMonth.toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      bookingsToCreate.push(carBooking);
    }
    
    console.log(`\nCreating ${bookingsToCreate.length} bookings...`);
    
    const result = await db.collection('bookings').insertMany(bookingsToCreate);
    
    console.log(`\n✅ Created ${result.insertedCount} bookings!`);
    
    // Calculate total revenue
    const totalRevenue = bookingsToCreate.reduce((sum, b) => sum + b.price.amount, 0);
    
    console.log(`\nSummary:`);
    console.log(`  Hotel bookings: ${bookingsToCreate.filter(b => b.type === 'hotel').length}`);
    console.log(`  Car bookings: ${bookingsToCreate.filter(b => b.type === 'car').length}`);
    console.log(`  Total Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`\n🎉 Refresh the owner dashboard to see the bookings and revenue!`);

  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

createBookingsForOwnerProperties();
