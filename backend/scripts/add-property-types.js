import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

// Property type mapping based on hotel names
const propertyTypeMapping = {
  // Resorts
  'Resort': ['resort', 'beach resort', 'beachfront', 'lake palace', 'exotica'],
  // Hotels
  'Hotel': ['hotel', 'inn', 'palace', 'grand', 'view'],
  // Apartments
  'Apartment': ['apartment', 'suites', 'studio'],
  // Villas
  'Villa': ['villa', 'villas'],
  // Hostels
  'Hostel': ['hostel', 'backpacker'],
  // Bed & Breakfast
  'Bed & Breakfast': ['bed and breakfast', 'b&b', 'guesthouse'],
  // Business Hotels
  'Business Hotel': ['business', 'corporate'],
};

// Determine property type from hotel name
function getPropertyType(hotelName) {
  const nameLower = hotelName.toLowerCase();
  
  // Check for resort keywords
  if (propertyTypeMapping['Resort'].some(keyword => nameLower.includes(keyword))) {
    return 'Resort';
  }
  
  // Check for apartment/suites
  if (propertyTypeMapping['Apartment'].some(keyword => nameLower.includes(keyword))) {
    return 'Apartment';
  }
  
  // Check for villa
  if (propertyTypeMapping['Villa'].some(keyword => nameLower.includes(keyword))) {
    return 'Villa';
  }
  
  // Check for hostel
  if (propertyTypeMapping['Hostel'].some(keyword => nameLower.includes(keyword))) {
    return 'Hostel';
  }
  
  // Check for B&B
  if (propertyTypeMapping['Bed & Breakfast'].some(keyword => nameLower.includes(keyword))) {
    return 'Bed & Breakfast';
  }
  
  // Check for business hotel
  if (propertyTypeMapping['Business Hotel'].some(keyword => nameLower.includes(keyword))) {
    return 'Business Hotel';
  }
  
  // Default to Hotel
  return 'Hotel';
}

async function addPropertyTypes() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('kayak');
    const collection = db.collection('hotels');
    
    // Get all hotels
    const hotels = await collection.find({}).toArray();
    console.log(`📊 Found ${hotels.length} hotels to update`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const hotel of hotels) {
      // Skip if propertyType already exists
      if (hotel.propertyType) {
        skipped++;
        continue;
      }
      
      const propertyType = getPropertyType(hotel.name || '');
      
      await collection.updateOne(
        { _id: hotel._id },
        { $set: { propertyType } }
      );
      
      updated++;
      console.log(`✅ Updated ${hotel.name}: ${propertyType}`);
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (already had propertyType): ${skipped}`);
    
    // Count by property type
    const typeCounts = await collection.aggregate([
      { $group: { _id: '$propertyType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    console.log('\n📊 Hotels by Property Type:');
    typeCounts.forEach(({ _id, count }) => {
      console.log(`   ${_id || 'Not set'}: ${count} hotels`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

addPropertyTypes();

