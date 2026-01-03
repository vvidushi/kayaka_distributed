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

const ownerId = '69359ff8cfd91c7ee1083908';
const ownerEmail = 'OwnerTest@gmail.com';

const hotelIds = ['HT-1765125799365', 'HT-10642', 'HT-10643', 'HT-10644', 'HT-1765173313481'];
const carIds = ['CR-5630', 'CR-5631', 'CR-5632'];

const updateBookings = async () => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    console.log('Owner:', ownerEmail);
    console.log('Owner ID:', ownerId);

    const db = client.db(dbName);
    
    // Find all bookings for owner's properties
    const bookings = await db.collection('bookings').find({
      $or: [
        { 'itinerary.hotelId': { $in: hotelIds } },
        { 'itinerary.carId': { $in: carIds } }
      ]
    }).toArray();
    
    console.log(`\nFound ${bookings.length} bookings for owner's properties`);
    
    if (bookings.length === 0) {
      console.log('No bookings to update');
      return;
    }
    
    let updatedCount = 0;
    
    for (const booking of bookings) {
      const propertyName = booking.itinerary?.hotelName || booking.itinerary?.vendor || 'Unknown';
      const amount = booking.price?.amount || 0;
      
      console.log(`\nBooking: ${booking.id}`);
      console.log(`  Property: ${propertyName}`);
      console.log(`  Amount: $${amount}`);
      console.log(`  Current ownerId: ${booking.ownerId || 'none'}`);
      
      const result = await db.collection('bookings').updateOne(
        { _id: booking._id },
        { 
          $set: { 
            ownerId: ownerId,
            ownerEmail: ownerEmail
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`  ✓ Updated`);
      } else {
        console.log(`  → Already up to date`);
      }
    }
    
    console.log(`\n✅ Summary:`);
    console.log(`   Total bookings: ${bookings.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`\nRefresh the owner dashboard to see bookings and revenue!`);

  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

updateBookings();
