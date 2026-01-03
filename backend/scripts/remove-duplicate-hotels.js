import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

async function removeDuplicates() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('kayak');
    const collection = db.collection('hotels');
    
    // Find all hotels grouped by id
    const hotels = await collection.find({}).toArray();
    const hotelMap = new Map();
    const duplicates = [];
    
    hotels.forEach(hotel => {
      const id = hotel.id;
      if (!hotelMap.has(id)) {
        hotelMap.set(id, [hotel]);
      } else {
        hotelMap.get(id).push(hotel);
        duplicates.push(hotel);
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate hotels found');
    } else {
      console.log(`⚠️  Found ${duplicates.length} duplicate hotels`);
      
      // Remove duplicates, keeping the first one
      for (const [id, hotelList] of hotelMap.entries()) {
        if (hotelList.length > 1) {
          // Keep the first one, delete the rest
          const toDelete = hotelList.slice(1);
          for (const hotel of toDelete) {
            await collection.deleteOne({ _id: hotel._id });
            console.log(`   Deleted duplicate: ${hotel.id} - ${hotel.name} (${hotel.city})`);
          }
        }
      }
      
      console.log(`✅ Removed ${duplicates.length} duplicate hotels`);
    }
    
    // Show final count by city
    const cityCounts = await collection.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('\n📊 Final hotels by city:');
    cityCounts.forEach(({ _id, count }) => {
      if (_id) {
        console.log(`   ${_id}: ${count} hotels`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

removeDuplicates();

