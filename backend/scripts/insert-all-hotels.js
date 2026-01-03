import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// All hotels from listings.controller.js (HT-2001 to HT-2043)
const allHotels = [
  { id: 'HT-2001', city: 'San Francisco', name: 'Bayview Hotel', rating: 4.5, pricePerNight: 180.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'parking'], lat: 37.7749, lng: -122.4194 },
  { id: 'HT-2002', city: 'San Francisco', name: 'Downtown Inn', rating: 3.8, pricePerNight: 120.0, currency: 'USD', amenities: ['wifi'], lat: 37.7849, lng: -122.4094 },
  { id: 'HT-2003', city: 'New Delhi', name: 'Aero Stay', rating: 4.2, pricePerNight: 90.0, currency: 'USD', amenities: ['wifi', 'airport_shuttle'], lat: 28.6139, lng: 77.2090 },
  { id: 'HT-2004', city: 'New York', name: 'Manhattan Grand Hotel', rating: 4.7, pricePerNight: 320.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'gym', 'pool'], lat: 40.7580, lng: -73.9855 },
  { id: 'HT-2005', city: 'New York', name: 'Brooklyn Bridge Inn', rating: 4.3, pricePerNight: 250.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'parking'], lat: 40.7061, lng: -73.9969 },
  { id: 'HT-2006', city: 'New York', name: 'Times Square Suites', rating: 4.1, pricePerNight: 280.0, currency: 'USD', amenities: ['wifi', 'gym'], lat: 40.7589, lng: -73.9851 },
  { id: 'HT-2007', city: 'Los Angeles', name: 'Hollywood Hills Resort', rating: 4.6, pricePerNight: 290.0, currency: 'USD', amenities: ['wifi', 'pool', 'spa', 'parking'], lat: 34.1341, lng: -118.3215 },
  { id: 'HT-2008', city: 'Los Angeles', name: 'Santa Monica Beach Hotel', rating: 4.4, pricePerNight: 260.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'beach_access'], lat: 34.0195, lng: -118.4912 },
  { id: 'HT-2009', city: 'London', name: 'Thames View Hotel', rating: 4.5, pricePerNight: 220.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'gym'], lat: 51.5074, lng: -0.1278 },
  { id: 'HT-2010', city: 'London', name: 'Westminster Palace Inn', rating: 4.8, pricePerNight: 350.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'spa', 'concierge'], lat: 51.4995, lng: -0.1248 },
  { id: 'HT-2011', city: 'Paris', name: 'Eiffel Tower Suites', rating: 4.9, pricePerNight: 400.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'spa', 'restaurant'], lat: 48.8584, lng: 2.2945 },
  { id: 'HT-2012', city: 'Paris', name: 'Champs-Élysées Hotel', rating: 4.6, pricePerNight: 310.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'gym'], lat: 48.8698, lng: 2.3078 },
  { id: 'HT-2013', city: 'Tokyo', name: 'Shibuya Grand Hotel', rating: 4.7, pricePerNight: 270.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'gym', 'spa'], lat: 35.6595, lng: 139.7004 },
  { id: 'HT-2014', city: 'Tokyo', name: 'Shinjuku Business Inn', rating: 4.2, pricePerNight: 180.0, currency: 'USD', amenities: ['wifi', 'breakfast'], lat: 35.6938, lng: 139.7036 },
  { id: 'HT-2015', city: 'Dubai', name: 'Burj Al Arab Luxury', rating: 5.0, pricePerNight: 850.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'beach_access', 'concierge'], lat: 25.1412, lng: 55.1853 },
  { id: 'HT-2016', city: 'Dubai', name: 'Marina Bay Hotel', rating: 4.5, pricePerNight: 320.0, currency: 'USD', amenities: ['wifi', 'pool', 'gym', 'parking'], lat: 25.0805, lng: 55.1410 },
  { id: 'HT-2017', city: 'Abu Dhabi', name: 'Emirates Palace Hotel', rating: 4.9, pricePerNight: 520.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'beach_access'], lat: 24.4619, lng: 54.3178 },
  { id: 'HT-2018', city: 'Abu Dhabi', name: 'Corniche Beach Resort', rating: 4.4, pricePerNight: 280.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'beach_access'], lat: 24.4764, lng: 54.3705 },
  // Indian Hotels
  { id: 'HT-2019', city: 'Mumbai', name: 'Taj Mahal Palace', rating: 4.8, pricePerNight: 350.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'gym', 'concierge'], lat: 18.9220, lng: 72.8332 },
  { id: 'HT-2020', city: 'Mumbai', name: 'The Oberoi Mumbai', rating: 4.7, pricePerNight: 320.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'restaurant'], lat: 19.0596, lng: 72.8295 },
  { id: 'HT-2021', city: 'Mumbai', name: 'Marine Drive Hotel', rating: 4.3, pricePerNight: 180.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'parking'], lat: 18.9432, lng: 72.8236 },
  { id: 'HT-2022', city: 'Bangalore', name: 'ITC Gardenia', rating: 4.6, pricePerNight: 220.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'gym', 'spa'], lat: 12.9716, lng: 77.5946 },
  { id: 'HT-2023', city: 'Bangalore', name: 'The Leela Palace', rating: 4.8, pricePerNight: 280.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'restaurant', 'concierge'], lat: 12.9352, lng: 77.6245 },
  { id: 'HT-2024', city: 'Bangalore', name: 'Koramangala Business Inn', rating: 4.2, pricePerNight: 120.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'parking'], lat: 12.9352, lng: 77.6245 },
  { id: 'HT-2025', city: 'Goa', name: 'Taj Exotica Resort', rating: 4.7, pricePerNight: 260.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'beach_access', 'spa'], lat: 15.2993, lng: 74.1240 },
  { id: 'HT-2026', city: 'Goa', name: 'Baga Beach Resort', rating: 4.4, pricePerNight: 150.0, currency: 'USD', amenities: ['wifi', 'pool', 'beach_access', 'restaurant'], lat: 15.5557, lng: 73.7519 },
  { id: 'HT-2027', city: 'Goa', name: 'Candolim Beachfront Hotel', rating: 4.3, pricePerNight: 130.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'beach_access', 'parking'], lat: 15.5177, lng: 73.7622 },
  { id: 'HT-2028', city: 'Jaipur', name: 'Rambagh Palace', rating: 4.9, pricePerNight: 400.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'restaurant', 'concierge'], lat: 26.9124, lng: 75.7873 },
  { id: 'HT-2029', city: 'Jaipur', name: 'Fairmont Jaipur', rating: 4.6, pricePerNight: 240.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'gym', 'spa'], lat: 26.8467, lng: 75.8003 },
  { id: 'HT-2030', city: 'Jaipur', name: 'Pink City Heritage Hotel', rating: 4.3, pricePerNight: 140.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'parking', 'restaurant'], lat: 26.9124, lng: 75.7873 },
  { id: 'HT-2031', city: 'Hyderabad', name: 'Taj Falaknuma Palace', rating: 4.8, pricePerNight: 380.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'restaurant', 'concierge'], lat: 17.3850, lng: 78.4867 },
  { id: 'HT-2032', city: 'Hyderabad', name: 'Novotel Hyderabad', rating: 4.4, pricePerNight: 180.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'gym'], lat: 17.4400, lng: 78.3489 },
  { id: 'HT-2033', city: 'Hyderabad', name: 'Hitech City Business Hotel', rating: 4.2, pricePerNight: 110.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'parking'], lat: 17.4485, lng: 78.3908 },
  { id: 'HT-2034', city: 'Chennai', name: 'ITC Grand Chola', rating: 4.7, pricePerNight: 290.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'gym', 'restaurant'], lat: 13.0827, lng: 80.2707 },
  { id: 'HT-2035', city: 'Chennai', name: 'The Leela Palace Chennai', rating: 4.6, pricePerNight: 260.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'beach_access'], lat: 13.0339, lng: 80.2811 },
  { id: 'HT-2036', city: 'Chennai', name: 'Marina Beach Hotel', rating: 4.1, pricePerNight: 130.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'parking'], lat: 13.0499, lng: 80.2824 },
  { id: 'HT-2037', city: 'Kolkata', name: 'The Oberoi Grand', rating: 4.7, pricePerNight: 270.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'gym', 'restaurant'], lat: 22.5726, lng: 88.3639 },
  { id: 'HT-2038', city: 'Kolkata', name: 'ITC Sonar', rating: 4.5, pricePerNight: 220.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'gym', 'spa'], lat: 22.5354, lng: 88.3959 },
  { id: 'HT-2039', city: 'Kolkata', name: 'Park Street Heritage Hotel', rating: 4.2, pricePerNight: 140.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'restaurant', 'parking'], lat: 22.5448, lng: 88.3526 },
  { id: 'HT-2040', city: 'Agra', name: 'The Oberoi Amarvilas', rating: 4.9, pricePerNight: 450.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'restaurant', 'concierge'], lat: 27.1751, lng: 78.0421 },
  { id: 'HT-2041', city: 'Agra', name: 'Taj View Hotel', rating: 4.4, pricePerNight: 180.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'restaurant'], lat: 27.1767, lng: 78.0081 },
  { id: 'HT-2042', city: 'Udaipur', name: 'Taj Lake Palace', rating: 4.9, pricePerNight: 500.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'restaurant', 'concierge', 'boat_service'], lat: 24.5761, lng: 73.6811 },
  { id: 'HT-2043', city: 'Udaipur', name: 'The Leela Palace Udaipur', rating: 4.8, pricePerNight: 380.0, currency: 'USD', amenities: ['wifi', 'breakfast', 'pool', 'spa', 'restaurant'], lat: 24.5854, lng: 73.7125 },
];

async function insertHotels() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('kayak');
    const collection = db.collection('hotels');
    
    // Insert hotels, ignoring duplicates
    try {
      const result = await collection.insertMany(allHotels, { ordered: false });
      console.log(`✅ Inserted ${result.insertedCount} hotels`);
      
      // Count hotels by city
      const cityCounts = await collection.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      console.log('\n📊 Hotels by city:');
      cityCounts.forEach(({ _id, count }) => {
        console.log(`   ${_id}: ${count} hotels`);
      });
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️  Some hotels already exist, checking what was inserted...');
        const existing = await collection.find({}).toArray();
        console.log(`✅ Found ${existing.length} total hotels in database`);
        
        // Count hotels by city
        const cityCounts = await collection.aggregate([
          { $group: { _id: '$city', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]).toArray();
        
        console.log('\n📊 Hotels by city:');
        cityCounts.forEach(({ _id, count }) => {
          console.log(`   ${_id}: ${count} hotels`);
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

insertHotels();

