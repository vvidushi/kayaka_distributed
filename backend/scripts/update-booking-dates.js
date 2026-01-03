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

const updateBookingToPast = async () => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const bookingsCollection = db.collection('bookings');

    // Find a hotel booking for the test traveler
    const booking = await bookingsCollection.findOne({
      userEmail: 'testtrav@example.com',
      'itinerary.hotelName': { $exists: true }
    });

    if (!booking) {
      console.log('No hotel booking found for testtrav@example.com');
      return;
    }

    console.log(`Found booking: ${booking.id}`);
    console.log(`Current dates: ${booking.itinerary.checkInDate} to ${booking.itinerary.checkOutDate}`);

    // Update to past dates (last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const checkInDate = lastMonth.toISOString().split('T')[0];
    
    const checkOutDate = new Date(lastMonth);
    checkOutDate.setDate(checkOutDate.getDate() + 2);
    const checkOutDateStr = checkOutDate.toISOString().split('T')[0];

    const result = await bookingsCollection.updateOne(
      { id: booking.id },
      { 
        $set: { 
          'itinerary.checkInDate': checkInDate,
          'itinerary.checkOutDate': checkOutDateStr,
          status: 'confirmed'
        } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Updated booking ${booking.id} to past dates:`);
      console.log(`   Check-in: ${checkInDate}`);
      console.log(`   Check-out: ${checkOutDateStr}`);
      console.log('\nNow refresh your bookings page to see the "Write Review" button!');
    } else {
      console.log('No changes made');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

updateBookingToPast();
