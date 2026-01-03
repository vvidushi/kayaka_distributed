#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const TRAVELER_EMAIL = 'testtrav@example.com';

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'kayak';
  
  if (!mongoUri) {
    console.error('MONGODB_URI is not configured');
    process.exit(1);
  }
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    const hotelsCollection = db.collection('hotels');
    const reviewsCollection = db.collection('reviews');
    
    // Find the traveler user
    const traveler = await usersCollection.findOne({ email: TRAVELER_EMAIL });
    if (!traveler) {
      console.error(`Traveler with email ${TRAVELER_EMAIL} not found`);
      process.exit(1);
    }
    
    console.log(`Found traveler: ${traveler.email} (ID: ${traveler.id})`);
    
    // Find Sunset Paradise Resort
    const hotel = await hotelsCollection.findOne({ name: /sunset paradise/i });
    if (!hotel) {
      console.error('Sunset Paradise Resort not found');
      process.exit(1);
    }
    
    console.log(`Found hotel: ${hotel.name} (ID: ${hotel.id})`);
    
    // Check if review already exists
    const existingReview = await reviewsCollection.findOne({
      listingId: hotel.id,
      userId: traveler.id
    });
    
    if (existingReview) {
      console.log('\n⚠️  Review already exists for this hotel by this user');
      console.log(`Rating: ${existingReview.rating}/5`);
      console.log(`Comment: ${existingReview.comment}`);
      process.exit(0);
    }
    
    // Create a new review
    const review = {
      _id: `REV-${Date.now()}`,
      id: `REV-${Date.now()}`,
      listingId: hotel.id,
      listingType: 'hotel',
      userId: traveler.id,
      userName: `${traveler.firstName || traveler.email.split('@')[0]}`,
      userEmail: traveler.email,
      rating: 5,
      comment: 'Amazing experience at Sunset Paradise Resort! The beach access was incredible, the pool was pristine, and the staff was extremely friendly. The room had a beautiful ocean view. Highly recommend for a relaxing Miami getaway!',
      createdAt: new Date(),
      updatedAt: new Date(),
      helpful: 0,
      verified: true,
    };
    
    await reviewsCollection.insertOne(review);
    console.log('\n✅ Review added successfully!');
    console.log(`Rating: ${review.rating}/5`);
    console.log(`Comment: ${review.comment}`);
    
    // Update hotel rating (optional - calculate average)
    const allHotelReviews = await reviewsCollection.find({ listingId: hotel.id }).toArray();
    const avgRating = allHotelReviews.reduce((sum, r) => sum + r.rating, 0) / allHotelReviews.length;
    
    await hotelsCollection.updateOne(
      { _id: hotel._id },
      { 
        $set: { 
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: allHotelReviews.length
        } 
      }
    );
    
    console.log(`\n📊 Hotel rating updated to ${avgRating.toFixed(1)}/5 (${allHotelReviews.length} reviews)`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
