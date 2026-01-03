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
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    const hotelsCollection = db.collection('hotels');
    const carsCollection = db.collection('cars');
    
    // Find the owner user
    const owner = await usersCollection.findOne({ email: OWNER_EMAIL });
    if (!owner) {
      console.error(`Owner with email ${OWNER_EMAIL} not found`);
      process.exit(1);
    }
    
    console.log(`Found owner: ${owner.email} (ID: ${owner.id})`);
    
    // Check existing properties
    const existingHotels = await hotelsCollection.countDocuments({ ownerId: owner.id });
    const existingCars = await carsCollection.countDocuments({ ownerId: owner.id });
    
    console.log(`\nExisting properties:`);
    console.log(`- Hotels: ${existingHotels}`);
    console.log(`- Cars: ${existingCars}`);
    
    // Get next IDs
    const lastHotel = await hotelsCollection.findOne(
      { _id: { $regex: /^HT-/ } },
      { sort: { _id: -1 } }
    );
    const lastCar = await carsCollection.findOne(
      { _id: { $regex: /^CR-/ } },
      { sort: { _id: -1 } }
    );
    
    const nextHotelId = lastHotel 
      ? parseInt(lastHotel._id.replace('HT-', '')) + 1 
      : 10000;
    const nextCarId = lastCar 
      ? parseInt(lastCar._id.replace('CR-', '')) + 1 
      : 5000;
    
    // Add 3 hotels
    const newHotels = [
      {
        _id: `HT-${nextHotelId}`,
        id: `HT-${nextHotelId}`,
        name: 'Luxury Manhattan Suite',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        rating: 4.7,
        pricePerNight: 299.99,
        currency: 'USD',
        amenities: ['wifi', 'breakfast', 'gym', 'pool', 'parking', 'restaurant'],
        lat: 40.7589,
        lng: -73.9851,
        neighbourhood: 'Midtown',
        availableRooms: 15,
        tags: ['luxury', 'business', 'central'],
        isDeal: false,
        limitedAvailability: false,
        ownerId: owner.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: `HT-${nextHotelId + 1}`,
        id: `HT-${nextHotelId + 1}`,
        name: 'Brooklyn Heights Boutique Hotel',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        rating: 4.5,
        pricePerNight: 199.99,
        currency: 'USD',
        amenities: ['wifi', 'breakfast', 'pet_friendly', 'bar'],
        lat: 40.6961,
        lng: -73.9969,
        neighbourhood: 'Brooklyn Heights',
        availableRooms: 8,
        tags: ['boutique', 'cozy', 'trendy'],
        isDeal: true,
        limitedAvailability: true,
        ownerId: owner.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: `HT-${nextHotelId + 2}`,
        id: `HT-${nextHotelId + 2}`,
        name: 'Times Square Executive Hotel',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        rating: 4.3,
        pricePerNight: 249.99,
        currency: 'USD',
        amenities: ['wifi', 'gym', 'room_service', 'bar', 'restaurant'],
        lat: 40.7580,
        lng: -73.9855,
        neighbourhood: 'Times Square',
        availableRooms: 20,
        tags: ['business', 'entertainment', 'central'],
        isDeal: false,
        limitedAvailability: false,
        ownerId: owner.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    // Add 3 cars
    const newCars = [
      {
        _id: `CR-${nextCarId}`,
        id: `CR-${nextCarId}`,
        vendor: 'Enterprise',
        type: 'Luxury Sedan',
        model: 'BMW 5 Series',
        seats: 5,
        pricePerDay: 120.00,
        currency: 'USD',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        location: '150 E 42nd Street, New York, NY 10017',
        features: ['GPS', 'Bluetooth', 'Leather Seats', 'Premium Audio'],
        transmission: 'Automatic',
        fuelType: 'Gasoline',
        available: true,
        ownerId: owner.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: `CR-${nextCarId + 1}`,
        id: `CR-${nextCarId + 1}`,
        vendor: 'Hertz',
        type: 'SUV',
        model: 'Toyota Highlander',
        seats: 7,
        pricePerDay: 95.00,
        currency: 'USD',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        location: '200 Park Avenue, New York, NY 10166',
        features: ['GPS', 'Backup Camera', 'Apple CarPlay', 'Third Row Seating'],
        transmission: 'Automatic',
        fuelType: 'Hybrid',
        available: true,
        ownerId: owner.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: `CR-${nextCarId + 2}`,
        id: `CR-${nextCarId + 2}`,
        vendor: 'Avis',
        type: 'Compact',
        model: 'Honda Civic',
        seats: 5,
        pricePerDay: 55.00,
        currency: 'USD',
        city: 'New York',
        state: 'NY',
        country: 'United States',
        location: '1 Penn Plaza, New York, NY 10119',
        features: ['Bluetooth', 'USB Charging', 'Cruise Control'],
        transmission: 'Automatic',
        fuelType: 'Gasoline',
        available: true,
        ownerId: owner.id,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    // Insert hotels
    console.log(`\nAdding ${newHotels.length} hotels...`);
    for (const hotel of newHotels) {
      await hotelsCollection.insertOne(hotel);
      console.log(`✓ Added hotel: ${hotel.name} (${hotel.id})`);
    }
    
    // Insert cars
    console.log(`\nAdding ${newCars.length} cars...`);
    for (const car of newCars) {
      await carsCollection.insertOne(car);
      console.log(`✓ Added car: ${car.model} (${car.id})`);
    }
    
    // Final count
    const finalHotels = await hotelsCollection.countDocuments({ ownerId: owner.id });
    const finalCars = await carsCollection.countDocuments({ ownerId: owner.id });
    
    console.log(`\n✅ Done! Owner now has:`);
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
