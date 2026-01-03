#!/usr/bin/env node

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

const checkBookings = async () => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('kayak');
    
    const bookings = await db.collection('bookings').find({}).toArray();
    
    console.log(`Total bookings: ${bookings.length}\n`);
    
    bookings.forEach(b => {
      console.log(`Booking ID: ${b.id}`);
      console.log(`  Type: ${b.type}`);
      console.log(`  Status: ${b.status}`);
      if (b.itinerary?.hotelId) {
        console.log(`  Hotel ID: ${b.itinerary.hotelId}`);
        console.log(`  Hotel Name: ${b.itinerary.hotelName}`);
      }
      if (b.itinerary?.carId) {
        console.log(`  Car ID: ${b.itinerary.carId}`);
        console.log(`  Vendor: ${b.itinerary.vendor}`);
      }
      console.log(`  Amount: $${b.price?.amount || 0}`);
      console.log(`  User: ${b.userEmail}`);
      console.log('');
    });

    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkBookings();
