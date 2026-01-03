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
    
    // Find the owner user by email
    const owner = await usersCollection.findOne({ email: OWNER_EMAIL });
    if (!owner) {
      console.error(`Owner with email ${OWNER_EMAIL} not found`);
      process.exit(1);
    }
    
    // Use the 'id' field from the user document
    const ownerId = owner.id || owner._id.toString();
    console.log(`Found owner: ${owner.email} (ID: ${ownerId})`);
    
    // Get next IDs
    const lastHotel = await hotelsCollection.findOne(
      {},
      { sort: { _id: -1 } }
    );
    const lastCar = await carsCollection.findOne(
      {},
      { sort: { _id: -1 } }
    );
    
    const nextHotelNum = lastHotel && lastHotel._id.match(/\d+/)
      ? parseInt(lastHotel._id.match(/\d+/)[0]) + 1 
      : 90000;
    const nextCarNum = lastCar && lastCar._id.match(/\d+/)
      ? parseInt(lastCar._id.match(/\d+/)[0]) + 1 
      : 9000;
    
    // Add 3 hotels
    const newHotels = [
      {
        _id: `HT-${nextHotelNum}`,
        id: `HT-${nextHotelNum}`,
        name: 'Sunset Paradise Resort',
        city: 'Miami',
        state: 'FL',
        country: 'United States',
        rating: 4.8,
        pricePerNight: 350.00,
        currency: 'USD',
        amenities: ['wifi', 'beach_access', 'pool', 'spa', 'restaurant', 'bar'],
        lat: 25.7617,
        lng: -80.1918,
        neighbourhood: 'South Beach',
        availableRooms: 25,
        tags: ['luxury', 'beach', 'resort'],
        isDeal: false,
        limitedAvailability: false,
        ownerId: ownerId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: `HT-${nextHotelNum + 1}`,
        id: `HT-${nextHotelNum + 1}`,
        name: 'Downtown Business Suites',
        city: 'Chicago',
        state: 'IL',
        country: 'United States',
        rating: 4.5,
        pricePerNight: 180.00,
        currency: 'USD',
        amenities: ['wifi', 'gym', 'breakfast', 'parking', 'business_center'],
        lat: 41.8781,
        lng: -87.6298,
        neighbourhood: 'Loop',
        availableRooms: 18,
        tags: ['business', 'downtown'],
        isDeal: true,
        limitedAvailability: false,
        ownerId: ownerId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: `HT-${nextHotelNum + 2}`,
        id: `HT-${nextHotelNum + 2}`,
        name: 'Mountain View Lodge',
        city: 'Denver',
        state: 'CO',
        country: 'United States',
        rating: 4.6,
        pricePerNight: 220.00,
        currency: 'USD',
        amenities: ['wifi', 'fireplace', 'parking', 'pet_friendly', 'restaurant'],
        lat: 39.7392,
        lng: -104.9903,
        neighbourhood: 'Downtown',
        availableRooms: 12,
        tags: ['scenic', 'cozy'],
        isDeal: false,
        limitedAvailability: true,
        ownerId: ownerId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    // Add 3 cars
    const newCars = [
      {
        _id: `CR-${nextCarNum}`,
        id: `CR-${nextCarNum}`,
        vendor: 'Luxury Rentals',
        type: 'Sports Car',
        model: 'Porsche 911',
        seats: 2,
        pricePerDay: 250.00,
        currency: 'USD',
        city: 'Miami',
        state: 'FL',
        country: 'United States',
        location: '100 Collins Avenue, Miami Beach, FL 33139',
        features: ['GPS', 'Premium Sound', 'Sport Mode', 'Convertible'],
        transmission: 'Automatic',
        fuelType: 'Gasoline',
        available: true,
        ownerId: ownerId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: `CR-${nextCarNum + 1}`,
        id: `CR-${nextCarNum + 1}`,
        vendor: 'Family Cars',
        type: 'Minivan',
        model: 'Honda Odyssey',
        seats: 8,
        pricePerDay: 85.00,
        currency: 'USD',
        city: 'Chicago',
        state: 'IL',
        country: 'United States',
        location: '50 W Madison St, Chicago, IL 60602',
        features: ['GPS', 'Backup Camera', 'DVD Player', 'Third Row'],
        transmission: 'Automatic',
        fuelType: 'Gasoline',
        available: true,
        ownerId: ownerId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: `CR-${nextCarNum + 2}`,
        id: `CR-${nextCarNum + 2}`,
        vendor: 'Eco Rentals',
        type: 'Electric',
        model: 'Tesla Model 3',
        seats: 5,
        pricePerDay: 120.00,
        currency: 'USD',
        city: 'Denver',
        state: 'CO',
        country: 'United States',
        location: '1550 17th St, Denver, CO 80202',
        features: ['Autopilot', 'Premium Audio', 'Supercharger Access', 'App Control'],
        transmission: 'Automatic',
        fuelType: 'Electric',
        available: true,
        ownerId: ownerId,
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
    
    // Get total count for this owner
    const totalHotels = await hotelsCollection.countDocuments({ ownerId: ownerId });
    const totalCars = await carsCollection.countDocuments({ ownerId: ownerId });
    
    console.log(`\n✅ Done! Owner ${owner.email} now has:`);
    console.log(`- Total Hotels: ${totalHotels}`);
    console.log(`- Total Cars: ${totalCars}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
