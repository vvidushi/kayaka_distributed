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

const makeAllCarsAvailable = async () => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    
    // Update all cars to be available
    const result = await db.collection('cars').updateMany(
      {},
      { $set: { available: true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} cars to be available`);
    
    // Check a sample
    const sampleCar = await db.collection('cars').findOne({ type: 'Economy' });
    console.log('\nSample car:');
    console.log('  Model:', sampleCar?.model);
    console.log('  Type:', sampleCar?.type);
    console.log('  Available:', sampleCar?.available);
    console.log('  Price:', sampleCar?.pricePerDay);

  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

makeAllCarsAvailable();
