import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const mumbaiHotels = [
  {
    id: 'HT-2019',
    city: 'Mumbai',
    name: 'Taj Mahal Palace',
    rating: 4.8,
    pricePerNight: 350.0,
    currency: 'USD',
    amenities: ['wifi', 'breakfast', 'pool', 'spa', 'gym', 'concierge'],
    lat: 18.9220,
    lng: 72.8332,
  },
  {
    id: 'HT-2020',
    city: 'Mumbai',
    name: 'The Oberoi Mumbai',
    rating: 4.7,
    pricePerNight: 320.0,
    currency: 'USD',
    amenities: ['wifi', 'breakfast', 'pool', 'spa', 'restaurant'],
    lat: 19.0596,
    lng: 72.8295,
  },
  {
    id: 'HT-2021',
    city: 'Mumbai',
    name: 'Marine Drive Hotel',
    rating: 4.3,
    pricePerNight: 180.0,
    currency: 'USD',
    amenities: ['wifi', 'breakfast', 'parking'],
    lat: 18.9432,
    lng: 72.8236,
  },
];

async function insertHotels() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('kayak');
    const collection = db.collection('hotels');
    
    // Insert hotels, ignoring duplicates
    try {
      const result = await collection.insertMany(mumbaiHotels, { ordered: false });
      console.log(`✅ Inserted ${result.insertedCount} Mumbai hotels`);
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Some hotels already exist, checking what was inserted...');
        const existing = await collection.find({ city: 'Mumbai' }).toArray();
        console.log(`✅ Found ${existing.length} Mumbai hotels in database`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

insertHotels();

