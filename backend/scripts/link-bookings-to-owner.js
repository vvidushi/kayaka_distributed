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

const linkBookingsToOwner = async () => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    
    // Get the owner's email
    const ownerEmail = 'OwnerTest@gmail.com';
    
    // First, find the owner user to get their ID
    const ownerUser = await db.collection('users').findOne({ 
      email: { $regex: new RegExp('^' + ownerEmail + '$', 'i') }
    });
    
    if (!ownerUser) {
      console.log(`Owner user not found: ${ownerEmail}`);
      return;
    }
    
    const ownerId = ownerUser.id || ownerUser._id;
    console.log(`Found owner: ${ownerEmail} (ID: ${ownerId})`);
    
    // Get all owner's properties
    const hotels = await db.collection('hotels').find({ 
      ownerId: ownerId
    }).toArray();
    
    const cars = await db.collection('cars').find({ 
      ownerId: ownerId
    }).toArray();
    
    console.log(`\nFound ${hotels.length} hotels and ${cars.length} cars for owner ${ownerEmail}`);
    
    if (hotels.length === 0 && cars.length === 0) {
      console.log('No properties found for this owner');
      return;
    }
    
    const hotelIds = hotels.map(h => h.id || h._id);
    const carIds = cars.map(c => c.id || c._id);
    
    console.log('Hotel IDs:', hotelIds);
    console.log('Car IDs:', carIds);
    
    // Get all bookings
    const allBookings = await db.collection('bookings').find({}).toArray();
    console.log(`\nTotal bookings in database: ${allBookings.length}`);
    
    let updatedCount = 0;
    let alreadyLinkedCount = 0;
    
    // Update bookings for hotels
    for (const hotelId of hotelIds) {
      const bookings = await db.collection('bookings').find({
        'itinerary.hotelId': hotelId
      }).toArray();
      
      console.log(`\nBookings for hotel ${hotelId}: ${bookings.length}`);
      
      for (const booking of bookings) {
        if (!booking.ownerId || !booking.ownerEmail) {
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
            console.log(`  ✓ Updated booking ${booking.id}`);
          }
        } else {
          alreadyLinkedCount++;
        }
      }
    }
    
    // Update bookings for cars
    for (const carId of carIds) {
      const bookings = await db.collection('bookings').find({
        'itinerary.carId': carId
      }).toArray();
      
      console.log(`\nBookings for car ${carId}: ${bookings.length}`);
      
      for (const booking of bookings) {
        if (!booking.ownerId || !booking.ownerEmail) {
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
            console.log(`  ✓ Updated booking ${booking.id}`);
          }
        } else {
          alreadyLinkedCount++;
        }
      }
    }
    
    console.log(`\n✅ Summary:`);
    console.log(`   Updated: ${updatedCount} booking(s)`);
    console.log(`   Already linked: ${alreadyLinkedCount} booking(s)`);
    console.log(`\nRefresh the owner dashboard to see the updated statistics!`);

  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

linkBookingsToOwner();
