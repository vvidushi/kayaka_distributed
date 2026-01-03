#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const OWNER_EMAIL = 'OwnerTest@gmail.com';

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
    const carsCollection = db.collection('cars');
    
    // Find the owner user
    const owner = await usersCollection.findOne({ email: OWNER_EMAIL });
    if (!owner) {
      console.error(`❌ Owner with email ${OWNER_EMAIL} not found`);
      process.exit(1);
    }
    
    console.log('=== OWNER DETAILS ===');
    console.log(`Email: ${owner.email}`);
    console.log(`ID (id field): ${owner.id}`);
    console.log(`MongoDB _id: ${owner._id}`);
    console.log(`Profile Type: ${owner.profileType}`);
    
    // Check for hotels with different ownerId patterns
    console.log('\n=== CHECKING HOTELS ===');
    
    const hotelsByUserId = await hotelsCollection.find({ ownerId: owner.id }).toArray();
    console.log(`Hotels with ownerId="${owner.id}": ${hotelsByUserId.length}`);
    if (hotelsByUserId.length > 0) {
      hotelsByUserId.forEach(h => console.log(`  - ${h.name} (${h.id})`));
    }
    
    const hotelsByMongoId = await hotelsCollection.find({ ownerId: owner._id.toString() }).toArray();
    console.log(`Hotels with ownerId="${owner._id.toString()}": ${hotelsByMongoId.length}`);
    if (hotelsByMongoId.length > 0) {
      hotelsByMongoId.forEach(h => console.log(`  - ${h.name} (${h.id})`));
    }
    
    const hotelsWithoutOwner = await hotelsCollection.find({ 
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null }
      ]
    }).toArray();
    console.log(`Hotels without ownerId: ${hotelsWithoutOwner.length}`);
    if (hotelsWithoutOwner.length > 0) {
      hotelsWithoutOwner.forEach(h => console.log(`  - ${h.name} (${h.id})`));
    }
    
    // Check all hotels to see what ownerId values exist
    const allHotels = await hotelsCollection.find({}).toArray();
    console.log(`\nAll hotels in database: ${allHotels.length}`);
    const uniqueOwnerIds = [...new Set(allHotels.map(h => h.ownerId).filter(Boolean))];
    console.log(`Unique ownerId values: ${uniqueOwnerIds.join(', ')}`);
    
    // Check for cars with different ownerId patterns
    console.log('\n=== CHECKING CARS ===');
    
    const carsByUserId = await carsCollection.find({ ownerId: owner.id }).toArray();
    console.log(`Cars with ownerId="${owner.id}": ${carsByUserId.length}`);
    if (carsByUserId.length > 0) {
      carsByUserId.forEach(c => console.log(`  - ${c.model || c.type} (${c.id})`));
    }
    
    const carsByMongoId = await carsCollection.find({ ownerId: owner._id.toString() }).toArray();
    console.log(`Cars with ownerId="${owner._id.toString()}": ${carsByMongoId.length}`);
    if (carsByMongoId.length > 0) {
      carsByMongoId.forEach(c => console.log(`  - ${c.model || c.type} (${c.id})`));
    }
    
    const carsWithoutOwner = await carsCollection.find({ 
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null }
      ]
    }).toArray();
    console.log(`Cars without ownerId: ${carsWithoutOwner.length}`);
    if (carsWithoutOwner.length > 0) {
      carsWithoutOwner.forEach(c => console.log(`  - ${c.model || c.type} (${c.id})`));
    }
    
    // Check all cars to see what ownerId values exist
    const allCars = await carsCollection.find({}).toArray();
    console.log(`\nAll cars in database: ${allCars.length}`);
    const uniqueCarOwnerIds = [...new Set(allCars.map(c => c.ownerId).filter(Boolean))];
    console.log(`Unique ownerId values: ${uniqueCarOwnerIds.join(', ')}`);
    
    // Offer to fix mismatched ownerIds
    console.log('\n=== FIX RECOMMENDATION ===');
    
    const needsFixHotels = allHotels.filter(h => 
      h.ownerId && h.ownerId !== owner.id && h.ownerId === owner._id.toString()
    );
    const needsFixCars = allCars.filter(c => 
      c.ownerId && c.ownerId !== owner.id && c.ownerId === owner._id.toString()
    );
    
    if (needsFixHotels.length > 0 || needsFixCars.length > 0) {
      console.log(`Found ${needsFixHotels.length} hotels and ${needsFixCars.length} cars with MongoDB _id instead of user.id`);
      console.log('Fixing ownerId fields...\n');
      
      for (const hotel of needsFixHotels) {
        await hotelsCollection.updateOne(
          { _id: hotel._id },
          { $set: { ownerId: owner.id } }
        );
        console.log(`✓ Fixed hotel: ${hotel.name} (${hotel.id})`);
      }
      
      for (const car of needsFixCars) {
        await carsCollection.updateOne(
          { _id: car._id },
          { $set: { ownerId: owner.id } }
        );
        console.log(`✓ Fixed car: ${car.model || car.type} (${car.id})`);
      }
      
      console.log('\n✅ All ownerId fields have been corrected!');
    } else {
      console.log('✅ All properties have correct ownerId fields.');
    }
    
    // Final summary
    const finalHotels = await hotelsCollection.countDocuments({ ownerId: owner.id });
    const finalCars = await carsCollection.countDocuments({ ownerId: owner.id });
    
    console.log('\n=== FINAL COUNT ===');
    console.log(`Owner ${owner.email} now has:`);
    console.log(`- Hotels: ${finalHotels}`);
    console.log(`- Cars: ${finalCars}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
