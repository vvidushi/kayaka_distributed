import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

const run = async () => {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const db = client.db();
    const flights = db.collection('flights');

    const pipeline = [
      {
        $match: {
          returnDate: { $in: [null, '', undefined] },
        },
      },
      {
        $group: {
          _id: { from: '$from', to: '$to' },
          earliestDate: { $min: '$departDate' },
          latestDate: { $max: '$departDate' },
          sampleAirlines: { $addToSet: '$airline' },
        },
      },
      { $sort: { '_id.from': 1, '_id.to': 1 } },
      { $limit: 20 },
    ];

    const results = await flights.aggregate(pipeline).toArray();
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Failed to fetch one-way flights:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
