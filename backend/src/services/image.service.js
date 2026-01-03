import { getBucket } from '../config/firebase.js';
import { logger } from '../config/logger.js';

/**
 * Generate a signed URL for a Firebase Storage file
 * @param {string} filePath - Path to file in Firebase Storage (e.g., 'kayak/cars/Porsche.jpeg')
 * @returns {Promise<string>} - Signed URL valid for 1 hour
 */
export const getSignedUrl = async (filePath) => {
  try {
    const bucket = getBucket();
    const file = bucket.file(filePath);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      logger.warn(`File not found in Firebase Storage: ${filePath}`);
      return null;
    }

    // Generate signed URL valid for 1 hour
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
    });

    return url;
  } catch (error) {
    logger.error(`Error generating signed URL for ${filePath}:`, error);
    return null;
  }
};

/**
 * Generate signed URLs for multiple files
 * @param {string[]} filePaths - Array of file paths
 * @returns {Promise<Object>} - Map of filePath to signed URL
 */
export const getSignedUrls = async (filePaths) => {
  const urlMap = {};
  
  await Promise.all(
    filePaths.map(async (filePath) => {
      const url = await getSignedUrl(filePath);
      if (url) {
        urlMap[filePath] = url;
      }
    })
  );
  
  return urlMap;
};

/**
 * Make a file publicly accessible (set public ACL)
 * @param {string} filePath - Path to file in Firebase Storage
 * @returns {Promise<string>} - Public URL
 */
export const makeFilePublic = async (filePath) => {
  try {
    const bucket = getBucket();
    const file = bucket.file(filePath);
    
    // Make file public
    await file.makePublic();
    
    // Return public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    logger.info(`File made public: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    logger.error(`Error making file public ${filePath}:`, error);
    return null;
  }
};

/**
 * Get public URL for a file (without making it public)
 * Assumes file is already public
 */
export const getPublicUrl = (filePath) => {
  const bucket = getBucket();
  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
};

/**
 * Upload an entity image to Firebase Storage
 * @param {Buffer} file - File buffer to upload
 * @param {string} entityType - Type of entity (hotel, car, etc.)
 * @param {string} entityId - ID of the entity
 * @param {string} filename - Original filename
 * @returns {Promise<string>} - Firebase Storage path
 */
export const uploadEntityImage = async (file, entityType, entityId, filename) => {
  try {
    const bucket = getBucket();
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = filename.split('.').pop();
    const uniqueFilename = `${entityId}_${timestamp}.${extension}`;
    
    // Define storage path
    const filePath = `kayak/${entityType}s/${uniqueFilename}`;
    const fileRef = bucket.file(filePath);
    
    // Upload file
    await fileRef.save(file, {
      metadata: {
        contentType: `image/${extension}`,
      },
    });
    
    logger.info(`Uploaded image: ${filePath}`);
    
    // Return the path (not full URL - backend will convert it)
    return filePath;
  } catch (error) {
    logger.error(`Error uploading image for ${entityType} ${entityId}:`, error);
    throw error;
  }
};

export default {
  getSignedUrl,
  getSignedUrls,
  makeFilePublic,
  getPublicUrl,
  uploadEntityImage,
};
