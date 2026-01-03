// Firebase Storage bucket name
const STORAGE_BUCKET = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'firegram-1r.appspot.com';

// Destination images stored in Firebase Storage
const DESTINATION_IMAGES = {
  'Los Angeles': 'kayak/destinations/los-angeles.jpg',
  'Las Vegas': 'kayak/destinations/las-vegas.jpg',
  'San Diego': 'kayak/destinations/san-diego.jpg',
  'Reno': 'kayak/destinations/reno.jpg',
  'New York': 'kayak/destinations/new-york.jpg',
  'Miami': 'kayak/destinations/miami.jpg',
  'London': 'kayak/destinations/london.jpg',
  'Paris': 'kayak/destinations/paris.jpg',
  'Tokyo': 'kayak/destinations/tokyo.jpg',
  'Rome': 'kayak/destinations/rome.jpg',
  'Dubai': 'kayak/destinations/dubai.jpg',
  'Sydney': 'kayak/destinations/sydney.jpg',
};

/**
 * Get Firebase Storage public URL for a destination image
 * Uses Firebase Storage public URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
 * Files must be public in Firebase Storage (allow read: if true)
 * @param {string} cityName - Name of the city
 * @returns {string|null} Firebase Storage public URL or null if city not found
 */
export const getDestinationImageUrl = (cityName) => {
  const storagePath = DESTINATION_IMAGES[cityName];
  if (!storagePath) {
    console.warn(`No image found for destination: ${cityName}`);
    return null;
  }

  // Use Firebase Storage public URL format
  // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;
};

/**
 * Synchronous version (alias for consistency)
 * @param {string} cityName - Name of the city
 * @returns {string|null} Firebase Storage public URL or null if city not found
 */
export const getDestinationImageUrlSync = getDestinationImageUrl;

export default DESTINATION_IMAGES;
