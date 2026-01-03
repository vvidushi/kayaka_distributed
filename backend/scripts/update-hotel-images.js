#!/usr/bin/env node

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not configured in backend/.env');
}
if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.FIREBASE_STORAGE_BUCKET) {
  throw new Error('Firebase credentials are missing. Check FIREBASE_SERVICE_ACCOUNT and FIREBASE_STORAGE_BUCKET.');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = getStorage().bucket();
const dbName = process.env.MONGODB_DB || 'kayak';

const CITY_IMAGE_SOURCES = {
  'los angeles': [
    'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1506976785307-8732e854ad89?auto=format&fit=crop&w=1600&q=80',
  ],
  'new york': [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80',
  ],
  'san francisco': [
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
  ],
  'chicago': [
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1600&q=80',
  ],
  'dallas': [
    'https://images.unsplash.com/photo-1529429617124-aee711a70412?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1478118981624-d6db3b9d0ce3?auto=format&fit=crop&w=1600&q=80',
  ],
  'denver': [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
  ],
  'atlanta': [
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1485948398388-75c0d3c43494?auto=format&fit=crop&w=1600&q=80',
  ],
  'las vegas': [
    'https://images.unsplash.com/photo-1499510318565-0f044d7f7de4?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1500077423678-3bd233b53d9a?auto=format&fit=crop&w=1600&q=80',
  ],
  'seattle': [
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
  ],
  'miami': [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
  ],
  'boston': [
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1600&q=80',
  ],
  'phoenix': [
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1499510318565-0f044d7f7de4?auto=format&fit=crop&w=1600&q=80',
  ],
  'houston': [
    'https://images.unsplash.com/photo-1473186505569-9c61870c11f9?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80',
  ],
  'orlando': [
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
  ],
  'newark': [
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80',
  ],
  'charlotte': [
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1485948398388-75c0d3c43494?auto=format&fit=crop&w=1600&q=80',
  ],
  'detroit': [
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1600&q=80',
  ],
  'philadelphia': [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1600&q=80',
  ],
  'baltimore': [
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1485948398388-75c0d3c43494?auto=format&fit=crop&w=1600&q=80',
  ],
};

const CITY_ALIASES = {
  'mott haven': 'new york',
  'upper west side': 'new york',
  'upper east side': 'new york',
  harlem: 'new york',
  brooklyn: 'new york',
  queens: 'new york',
  bronx: 'new york',
  manhattan: 'new york',
  'jersey city': 'newark',
  hoboken: 'newark',
  'santa monica': 'los angeles',
  venice: 'los angeles',
  pasadena: 'los angeles',
  anaheim: 'los angeles',
  scottsdale: 'phoenix',
  oakland: 'san francisco',
  berkeley: 'san francisco',
  'san jose': 'san francisco',
};

const DEFAULT_IMAGE_SOURCES = [
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1501117716987-c8e1ecb210cc?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
];

const normalizeKey = (value) => (value ? value.toString().trim().toLowerCase() : '');

const hashToIndex = (input, length) => {
  if (!length) return 0;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % length;
};

const selectImageSourceForHotel = (hotel) => {
  const candidatesOrder = [
    normalizeKey(hotel.city),
    normalizeKey(hotel.neighbourhood),
    normalizeKey(hotel.state),
  ].filter(Boolean);

  for (const rawKey of candidatesOrder) {
    const key = CITY_ALIASES[rawKey] || rawKey;
    const pool = CITY_IMAGE_SOURCES[key];
    if (pool && pool.length > 0) {
      const basis = `${hotel.id || hotel._id?.toString() || hotel.name || key}-${key}`;
      const index = hashToIndex(basis, pool.length);
      return pool[index];
    }
  }

  const fallbackIndex = hashToIndex(hotel.id || hotel._id?.toString() || hotel.name || 'default', DEFAULT_IMAGE_SOURCES.length);
  return DEFAULT_IMAGE_SOURCES[fallbackIndex] || null;
};

const downloadImageBuffer = async (url) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 45000,
    headers: {
      'User-Agent': 'KayakImageBot/1.0 (+https://github.com/shra012/Kayak-clone)',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });

  const contentType = response.headers['content-type'] || 'image/jpeg';
  return { buffer: Buffer.from(response.data), contentType };
};

const uploadToFirebase = async (buffer, contentType, storagePath) => {
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000',
    },
  });

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
};

const run = async () => {
  const forceUpdate = process.argv.includes('--force');
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : null;

  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(dbName);
    const hotelsCollection = db.collection('hotels');

    const filter = forceUpdate
      ? {}
      : {
          $or: [
            { imageUrl: { $exists: false } },
            { imageUrl: '' },
            { imageUrl: null },
          ],
        };

    const cursor = hotelsCollection.find(filter).sort({ updatedAt: 1 });
    if (limit && Number.isFinite(limit) && limit > 0) {
      cursor.limit(limit);
    }

    const hotels = await cursor.toArray();
    if (!hotels.length) {
      console.log('No hotels matched the selection criteria.');
      return;
    }

    console.log(`Preparing to update images for ${hotels.length} hotel${hotels.length === 1 ? '' : 's'}${forceUpdate ? ' (force mode)' : ''}${dryRun ? ' [dry-run]' : ''}.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const [index, hotel] of hotels.entries()) {
      const hotelId = hotel.id || hotel._id?.toString();
      if (!hotelId) {
        skippedCount += 1;
        console.warn(`Skipping hotel without id: ${hotel.name || hotel._id}`);
        continue;
      }

      const sourceUrl = selectImageSourceForHotel(hotel);
      if (!sourceUrl) {
        skippedCount += 1;
        console.warn(`No image source found for hotel: ${hotel.name || hotelId}`);
        continue;
      }

      const storagePath = `kayak/hotels/${hotelId}/1.jpg`;
      console.log(`\n[${index + 1}/${hotels.length}] ${hotel.name} (${hotel.city || 'Unknown city'})`);
      console.log(`Using source: ${sourceUrl}`);

      if (dryRun) {
        console.log(`[dry-run] Would upload to ${storagePath}`);
        updatedCount += 1;
        continue;
      }

      try {
        const { buffer, contentType } = await downloadImageBuffer(sourceUrl);
        const publicUrl = await uploadToFirebase(buffer, contentType, storagePath);

        const updatePayload = {
          imageUrl: publicUrl,
          imageStoragePath: storagePath,
          imageSource: sourceUrl,
          updatedAt: new Date(),
        };

        await hotelsCollection.updateOne({ _id: hotel._id }, { $set: updatePayload });
        console.log(`Updated Mongo record with URL: ${publicUrl}`);
        updatedCount += 1;
      } catch (error) {
        skippedCount += 1;
        console.error(`Failed to process ${hotel.name || hotelId}:`, error.message);
      }
    }

    console.log(`\nImage update complete. Updated ${updatedCount} hotel${updatedCount === 1 ? '' : 's'}${dryRun ? ' (dry-run)' : ''}.`);
    if (skippedCount) {
      console.log(`Skipped ${skippedCount} hotel${skippedCount === 1 ? '' : 's'} due to missing data or download errors.`);
    }
  } catch (error) {
    console.error('Failed to update hotel images:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
};

run();
