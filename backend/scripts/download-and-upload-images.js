#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';
import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: storageBucket,
});

const bucket = getStorage().bucket();

/**
 * Search DuckDuckGo for images
 * DuckDuckGo doesn't have a public API, so we'll use a workaround with their HTML search
 */
async function searchDuckDuckGoImages(query, count = 10) {
  try {
    // Use DuckDuckGo's image search endpoint
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    
    // Alternative: Use a DuckDuckGo image search API wrapper
    // For now, we'll use a simple approach with Unsplash as fallback
    console.log(`Searching for: ${query}`);
    
    // Using Unsplash API as a reliable source (free, no API key needed for basic usage)
    // Or we can use Pexels API
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&client_id=YOUR_UNSPLASH_ACCESS_KEY`;
    
    // For now, let's use a simpler approach with placeholder images or direct URLs
    // You can replace these with actual DuckDuckGo image URLs
    return [];
  } catch (error) {
    console.error(`Error searching for ${query}:`, error.message);
    return [];
  }
}

/**
 * Download image from URL
 */
async function downloadImage(url, filepath) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message);
    throw error;
  }
}

/**
 * Upload image to Firebase Storage
 */
async function uploadToFirebase(localPath, storagePath) {
  try {
    const file = bucket.file(storagePath);
    const fileStream = fs.createReadStream(localPath);
    
    await new Promise((resolve, reject) => {
      fileStream
        .pipe(file.createWriteStream({
          metadata: {
            contentType: getContentType(localPath),
            cacheControl: 'public, max-age=31536000',
          },
        }))
        .on('error', reject)
        .on('finish', resolve);
    });

    // Make file publicly accessible
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${storageBucket}/${storagePath}`;
    console.log(`Uploaded: ${storagePath}`);
    console.log(`Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading ${storagePath}:`, error.message);
    throw error;
  }
}

function getContentType(filepath) {
  const ext = filepath.split('.').pop().toLowerCase();
  const types = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
  };
  return types[ext] || 'image/jpeg';
}

/**
 * Get image URLs from Unsplash (free, no API key needed for basic usage)
 * Or use Pexels API
 */
async function getImageUrlsFromUnsplash(query, count = 6) {
  // Using Unsplash Source API (no key required, but rate limited)
  // For production, get a free API key from https://unsplash.com/developers
  const urls = [];
  
  // For now, using placeholder URLs - replace with actual Unsplash/Pexels API calls
  // You can get free API keys from:
  // - Unsplash: https://unsplash.com/developers (free tier: 50 requests/hour)
  // - Pexels: https://www.pexels.com/api/ (free tier: 200 requests/hour)
  
  console.log(`Note: Replace with actual Unsplash/Pexels API calls for ${query}`);
  return urls;
}

/**
 * Main function to download and upload images
 */
async function downloadAndUploadImages() {
  const tempDir = join(__dirname, '..', 'temp_images');
  
  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Image configurations
  const imageConfigs = {
    flights: [
      { 
        name: 'flight1.jpg', 
        sourceUrls: ['https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80'], // Airplane in sky
        format: 'jpg' 
      },
      { 
        name: 'flight2.jpg', 
        sourceUrls: ['https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80'], // Aircraft
        format: 'jpg' 
      },
      { 
        name: 'flight3.jpg', 
        sourceUrls: ['https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=800&q=80'], // Airplane window view
        format: 'jpg' 
      },
      { 
        name: 'flight4.webp', 
        sourceUrls: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80'], // Airport terminal
        format: 'webp' 
      },
      { 
        name: 'flight5.jpg', 
        sourceUrls: ['https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=800&q=80'], // Airplane sunset
        format: 'jpg' 
      },
      { 
        name: 'flight6.jpg', 
        sourceUrls: ['https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80'], // Airplane takeoff
        format: 'jpg' 
      },
    ],
    stays: [
      { name: 'stays1.webp', query: 'luxury hotel room', format: 'webp' },
      { name: 'stays2.jpg', query: 'hotel lobby', format: 'jpg' },
      { name: 'stays3.webp', query: 'resort pool', format: 'webp' },
      { name: 'stays4.jpg', query: 'hotel bedroom', format: 'jpg' },
      { name: 'stays5.jpg', query: 'beach resort', format: 'jpg' },
      { name: 'stays6.jpeg', query: 'hotel exterior', format: 'jpeg' },
    ],
    // Destination hero images shown on the homepage deals
    destinations: [
      { name: 'los-angeles.jpg', sourceUrls: ['https://images.unsplash.com/photo-1503264116251-35a269479413?auto=format&fit=crop&w=1600&q=80'] },
      { name: 'las-vegas.jpg', sourceUrls: ['https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80'] },
      { name: 'san-diego.jpg', sourceUrls: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80'] },
      {
        name: 'reno.jpg',
        sourceUrls: [
          'https://images.unsplash.com/photo-1534108392-94a232c27a4b?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1519810812262-1585c1f31b3e?auto=format&fit=crop&w=1600&q=80',
        ],
      },
      { name: 'new-york.jpg', sourceUrls: ['https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80'] },
      { name: 'miami.jpg', sourceUrls: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80'] },
      {
        name: 'london.jpg',
        sourceUrls: [
          'https://images.unsplash.com/photo-1439416915279-68957d86ad1e?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80',
        ],
      },
      { name: 'paris.jpg', sourceUrls: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80'] },
      { name: 'tokyo.jpg', sourceUrls: ['https://images.unsplash.com/photo-1549692520-acc6669e2f0c?auto=format&fit=crop&w=1600&q=80'] },
      { name: 'rome.jpg', sourceUrls: ['https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1600&q=80'] },
      { name: 'dubai.jpg', sourceUrls: ['https://images.unsplash.com/photo-1504274066651-8d31a536b11a?auto=format&fit=crop&w=1600&q=80'] },
      { 
        name: 'sydney.jpg',
        // Try multiple sources to avoid 404s
        sourceUrls: [
          'https://images.unsplash.com/photo-1506976785307-8732e854ad89?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1600&q=80',
        ],
      },
    ],
    // Car product images used by the cars listing grid
    productCars: [
      {
        name: 'Porsche.jpeg',
        sourceUrls: [
          'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1600&q=80',
        ],
      },
      {
        name: 'marek-pospisil-oUBjd22gF6w-unsplash.jpg',
        sourceUrls: [
          'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80',
        ],
      },
      {
        name: 'porche.jpg',
        sourceUrls: [
          'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1600&q=80',
        ],
      },
      {
        name: 'lambo_interior.jpg',
        sourceUrls: [
          'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80',
        ],
      },
    ],
  };

  try {
    for (const [category, images] of Object.entries(imageConfigs)) {
      console.log(`\n=== Processing ${category.toUpperCase()} images ===`);
      
      for (const imageConfig of images) {
        const { name, query, sourceUrl, sourceUrls } = imageConfig;
        const storagePath =
          category === 'destinations'
            ? `kayak/destinations/${name}`
            : category === 'productCars'
              ? `kayak/product/cars/${name}`
              : `kayak/backgrounds/${category}/${name}`;
        const localPath = join(tempDir, name);
        
        try {
          // Build a list of candidate URLs in priority order
          const candidates = [];
          if (Array.isArray(sourceUrls)) {
            candidates.push(...sourceUrls);
          } else if (sourceUrl) {
            candidates.push(sourceUrl);
          }

          // Prefer explicit source URLs; fall back to search placeholder
          if (candidates.length === 0 && !query) {
            console.log(`No source URL/query for ${name}, skipping. Expected storage path: ${storagePath}`);
            continue;
          }

          let imageUrl = null;

          if (candidates.length === 0 && query) {
            const imageUrls = await getImageUrlsFromUnsplash(query, 1);
            if (imageUrls.length === 0) {
              console.log(`No images found for "${query}". Please provide image URLs manually.`);
              console.log(`   Expected storage path: ${storagePath}`);
              continue;
            }
            imageUrl = imageUrls[0];
          } else {
            // Try each candidate URL until one succeeds
            let downloaded = false;
            for (const candidate of candidates) {
              try {
                console.log(`Downloading: ${candidate}`);
                await downloadImage(candidate, localPath);
                imageUrl = candidate;
                downloaded = true;
                break;
              } catch (err) {
                console.error(`Failed to download ${candidate}: ${err.message}`);
              }
            }

            if (!downloaded && query) {
              const imageUrls = await getImageUrlsFromUnsplash(query, 1);
              if (imageUrls.length > 0) {
                imageUrl = imageUrls[0];
                console.log(`Downloading fallback search result: ${imageUrl}`);
                await downloadImage(imageUrl, localPath);
                downloaded = true;
              }
            }

            if (!downloaded) {
              console.log(`No valid image sources for ${name}. Skipping. Expected storage path: ${storagePath}`);
              continue;
            }
          }

          // If we got here and haven't downloaded yet (search path), download now
          if (imageUrl && !fs.existsSync(localPath)) {
            console.log(`Downloading: ${imageUrl}`);
            await downloadImage(imageUrl, localPath);
          }
          
          // Upload to Firebase
          await uploadToFirebase(localPath, storagePath);
          
          // Clean up local file
          fs.unlinkSync(localPath);
          
        } catch (error) {
          console.error(`Failed to process ${name}:`, error.message);
        }
      }
    }
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('\nDone!');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
downloadAndUploadImages();
