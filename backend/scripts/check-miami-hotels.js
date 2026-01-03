#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

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
    const hotelsCollection = db.collection('hotels');
    
    // Search for Miami hotels
    console.log('=== HOTELS IN MIAMI ===');
    const miamiHotels = await hotelsCollection.find({ city: 'Miami' }).toArray();
    console.log(`Found ${miamiHotels.length} hotels in Miami:`);
    miamiHotels.forEach(h => {
      console.log(`  - ${h.name} (${h.id}) - Status: ${h.status || 'N/A'}`);
      console.log(`    City: ${h.city}, Price: $${h.pricePerNight}`);
    });
    
    // Search for hotels with "sunset" in name
    console.log('\n=== HOTELS WITH "SUNSET" IN NAME ===');
    const sunsetHotels = await hotelsCollection.find({ 
      name: new RegExp('sunset', 'i') 
    }).toArray();
    console.log(`Found ${sunsetHotels.length} hotels with "sunset" in name:`);
    sunsetHotels.forEach(h => {
      console.log(`  - ${h.name} (${h.id}) - Status: ${h.status || 'N/A'}`);
      console.log(`    City: ${h.city}, Price: $${h.pricePerNight}`);
    });
    
    // Check distinct cities
    console.log('\n=== ALL DISTINCT CITIES ===');
    const cities = await hotelsCollection.distinct('city');
    console.log(`Total distinct cities: ${cities.length}`);
    console.log('Cities:', cities.slice(0, 20).join(', '));
    
  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
