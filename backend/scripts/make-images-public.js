#!/usr/bin/env node

import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

if (!process.env.FIREBASE_SERVICE_ACCOUNT || !process.env.FIREBASE_STORAGE_BUCKET) {
  throw new Error('Firebase credentials are missing. Check FIREBASE_SERVICE_ACCOUNT and FIREBASE_STORAGE_BUCKET.');
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = getStorage().bucket();

const makeAllHotelImagesPublic = async () => {
  try {
    console.log('Fetching all images from kayak/...');
    const [files] = await bucket.getFiles({ prefix: 'kayak/' });
    
    if (!files.length) {
      console.log('No images found in kayak/');
      return;
    }

    console.log(`Found ${files.length} file(s). Making them public...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        await file.makePublic();
        console.log(`✓ ${file.name}`);
        successCount++;
      } catch (error) {
        console.error(`✗ ${file.name}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\nDone! ${successCount} file(s) made public, ${errorCount} error(s).`);
  } catch (error) {
    console.error('Failed to make images public:', error);
    process.exitCode = 1;
  }
};

makeAllHotelImagesPublic();
