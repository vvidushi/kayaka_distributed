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

const createPastBooking = async () => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    
    // Get a hotel from the database
    const hotel = await db.collection('hotels').findOne({ 
      $or: [
        { name: /sunset paradise/i },
        { city: 'Miami' }
      ]
    });

    if (!hotel) {
      console.log('❌ No hotel found. Please make sure hotels exist in the database.');
      return;
    }

    console.log(`Found hotel: ${hotel.name}`);

    // Create past dates (last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const checkInDate = lastMonth.toISOString().split('T')[0];
    
    const checkOutDate = new Date(lastMonth);
    checkOutDate.setDate(checkOutDate.getDate() + 3); // 3 night stay
    const checkOutDateStr = checkOutDate.toISOString().split('T')[0];

    const nights = 3;
    const totalAmount = hotel.pricePerNight * nights;

    // Generate booking ID
    const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const booking = {
      id: bookingId,
      userId: 'test-user-id',
      userEmail: 'testtrav@example.com', // Using test traveler
      userName: 'Test Traveler',
      type: 'hotel',
      status: 'confirmed',
      paymentStatus: 'paid',
      itinerary: {
        hotelId: hotel.id || hotel._id,
        hotelName: hotel.name,
        city: hotel.city,
        state: hotel.state,
        checkInDate: checkInDate,
        checkOutDate: checkOutDateStr,
        nights: nights,
        guests: 2,
        roomType: 'Standard Room'
      },
      price: {
        amount: totalAmount,
        currency: hotel.currency || 'USD',
        breakdown: {
          basePrice: hotel.pricePerNight * nights,
          taxes: totalAmount * 0.1,
          fees: 0
        }
      },
      createdAt: lastMonth.toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection('bookings').insertOne(booking);

    if (result.insertedId) {
      console.log(`\n✅ Created past booking successfully!`);
      console.log(`   Booking ID: ${bookingId}`);
      console.log(`   Hotel: ${hotel.name}`);
      console.log(`   Check-in: ${checkInDate}`);
      console.log(`   Check-out: ${checkOutDateStr}`);
      console.log(`   Total: ${hotel.currency || 'USD'} ${totalAmount.toFixed(2)}`);
      console.log(`\n🎉 Now refresh your bookings page to see the "Write Review" button!`);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

createPastBooking();
