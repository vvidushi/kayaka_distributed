import { storage } from '../config/firebase';
import { getDownloadURL, ref } from 'firebase/storage';

const STORAGE_BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'firegram-1r.appspot.com';

/**
 * Get Firebase Storage URL for a static background image
 * Uses Firebase Storage public URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
 * @param {string} imagePath - Path relative to kayak/backgrounds/
 * @returns {string} Firebase Storage URL
 */
export const getBackgroundImageUrl = (imagePath) => {
  const fullPath = imagePath.startsWith('kayak/') ? imagePath : `kayak/backgrounds/${imagePath}`;
  // Encode the path for Firebase Storage URL format
  const encodedPath = encodeURIComponent(fullPath);
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;
};

/**
 * Get Firebase Storage URL asynchronously (for signed URLs if needed)
 * @param {string} imagePath - Path relative to kayak/backgrounds/
 * @returns {Promise<string>} Firebase Storage URL
 */
export const getBackgroundImageUrlAsync = async (imagePath) => {
  const fullPath = imagePath.startsWith('kayak/') ? imagePath : `kayak/backgrounds/${imagePath}`;
  try {
    const storageRef = ref(storage, fullPath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.warn(`Failed to get Firebase URL for ${fullPath}, using public URL`);
    return getBackgroundImageUrl(imagePath);
  }
};

// Static image paths in Firebase Storage
export const BACKGROUND_IMAGES = {
  // Car images
  cars: {
    cars1: 'kayak/backgrounds/cars/cars1.jpg',
    cars2: 'kayak/backgrounds/cars/cars2.jpg',
    cars3: 'kayak/backgrounds/cars/cars3.jpg',
    cars4: 'kayak/backgrounds/cars/cars4.webp',
    cars5: 'kayak/backgrounds/cars/cars5.jpg',
    cars6: 'kayak/backgrounds/cars/cars6.webp',
  },
  // Flight images
  flights: {
    flight1: 'kayak/backgrounds/flights/flight1.jpg',
    flight2: 'kayak/backgrounds/flights/flight2.jpg',
    flight3: 'kayak/backgrounds/flights/flight3.jpg',
    flight4: 'kayak/backgrounds/flights/flight4.webp',
    flight5: 'kayak/backgrounds/flights/flight5.jpg',
    flight6: 'kayak/backgrounds/flights/flight6.jpg',
  },
  // Hotel/Stay images
  stays: {
    stays1: 'kayak/backgrounds/stays/stays1.webp',
    stays2: 'kayak/backgrounds/stays/stays2.jpg',
    stays3: 'kayak/backgrounds/stays/stays3.webp',
    stays4: 'kayak/backgrounds/stays/stays4.jpg',
    stays5: 'kayak/backgrounds/stays/stays5.jpg',
    stays6: 'kayak/backgrounds/stays/stays6.jpeg',
  },
};

// Helper functions for each category
export const getCarImageUrl = (imageName) => {
  const path = BACKGROUND_IMAGES.cars[imageName];
  return path ? getBackgroundImageUrl(path) : null;
};

export const getFlightImageUrl = (imageName) => {
  const path = BACKGROUND_IMAGES.flights[imageName];
  return path ? getBackgroundImageUrl(path) : null;
};

export const getStayImageUrl = (imageName) => {
  const path = BACKGROUND_IMAGES.stays[imageName];
  return path ? getBackgroundImageUrl(path) : null;
};

// Convenience functions for HomePage
export const getHomePageCarImages = () => ({
  cars1: getCarImageUrl('cars1'),
  cars2: getCarImageUrl('cars2'),
  cars3: getCarImageUrl('cars3'),
  cars4: getCarImageUrl('cars4'),
  cars5: getCarImageUrl('cars5'),
  cars6: getCarImageUrl('cars6'),
});

export const getHomePageFlightImages = () => ({
  flight1: getFlightImageUrl('flight1'),
  flight2: getFlightImageUrl('flight2'),
  flight3: getFlightImageUrl('flight3'),
  flight4: getFlightImageUrl('flight4'),
  flight5: getFlightImageUrl('flight5'),
  flight6: getFlightImageUrl('flight6'),
});

export const getHomePageStayImages = () => ({
  stays1: getStayImageUrl('stays1'),
  stays2: getStayImageUrl('stays2'),
  stays3: getStayImageUrl('stays3'),
  stays4: getStayImageUrl('stays4'),
  stays5: getStayImageUrl('stays5'),
  stays6: getStayImageUrl('stays6'),
});

