import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Create indexes for MongoDB collections (non-destructive)
 * This script safely creates indexes if they don't already exist
 */
const createIndexes = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    logger.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    logger.info('Connected to MongoDB');
    
    const db = client.db();
    
    logger.info('Creating indexes for MongoDB collections...');
    
    // Airports collection indexes
    logger.info('Creating indexes for airports collection...');
    const airportsCollection = db.collection('airports');
    await airportsCollection.createIndex({ code: 1 }, { unique: true, background: true });
    await airportsCollection.createIndex({ city: 1 }, { background: true });
    await airportsCollection.createIndex({ state: 1 }, { background: true });
    logger.info('Airports indexes created');
    
    // Flights collection indexes
    logger.info('Creating indexes for flights collection...');
    const flightsCollection = db.collection('flights');
    await flightsCollection.createIndex({ from: 1, to: 1, departDate: 1 }, { background: true });
    await flightsCollection.createIndex({ airline: 1 }, { background: true });
    await flightsCollection.createIndex({ price: 1 }, { background: true });
    await flightsCollection.createIndex({ isDeal: 1 }, { background: true });
    await flightsCollection.createIndex({ class: 1 }, { background: true });
    await flightsCollection.createIndex({ availableSeats: 1 }, { background: true });
    await flightsCollection.createIndex({ from: 1, to: 1 }, { background: true });
    logger.info('Flights indexes created');
    
    // Hotels collection indexes
    logger.info('Creating indexes for hotels collection...');
    const hotelsCollection = db.collection('hotels');
    await hotelsCollection.createIndex({ city: 1 }, { background: true });
    await hotelsCollection.createIndex({ state: 1 }, { background: true });
    await hotelsCollection.createIndex({ pricePerNight: 1 }, { background: true });
    await hotelsCollection.createIndex({ rating: 1 }, { background: true });
    await hotelsCollection.createIndex({ isDeal: 1 }, { background: true });
    logger.info('Hotels indexes created');
    
    // Cars collection indexes
    logger.info('Creating indexes for cars collection...');
    const carsCollection = db.collection('cars');
    await carsCollection.createIndex({ city: 1 }, { background: true });
    await carsCollection.createIndex({ state: 1 }, { background: true });
    await carsCollection.createIndex({ pricePerDay: 1 }, { background: true });
    logger.info('Cars indexes created');
    
    // Watches collection indexes
    logger.info('Creating indexes for watches collection...');
    const watchesCollection = db.collection('watches');
    await watchesCollection.createIndex({ userId: 1 }, { background: true });
    await watchesCollection.createIndex({ listingType: 1, listingId: 1, status: 1 }, { background: true });
    await watchesCollection.createIndex({ status: 1 }, { background: true });
    await watchesCollection.createIndex({ userId: 1, status: 1 }, { background: true });
    logger.info('Watches indexes created');
    
    // Concierge sessions collection indexes (if needed)
    logger.info('Creating indexes for concierge_sessions collection...');
    const conciergeCollection = db.collection('concierge_sessions');
    await conciergeCollection.createIndex({ userId: 1 }, { background: true });
    await conciergeCollection.createIndex({ status: 1 }, { background: true });
    await conciergeCollection.createIndex({ createdAt: 1 }, { background: true });
    logger.info('Concierge sessions indexes created');
    
    // User traces collection indexes (if needed)
    logger.info('Creating indexes for user_traces collection...');
    const tracesCollection = db.collection('user_traces');
    await tracesCollection.createIndex({ userId: 1 }, { background: true });
    await tracesCollection.createIndex({ cohort: 1 }, { background: true });
    await tracesCollection.createIndex({ createdAt: 1 }, { background: true });
    logger.info('User traces indexes created');
    
    logger.info('All indexes created successfully');
    
  } catch (error) {
    logger.error('Error creating indexes:', error);
    throw error;
  } finally {
    await client.close();
  }
};

createIndexes()
  .then(() => {
    logger.info('Index creation script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Index creation script failed:', error);
    process.exit(1);
  });

