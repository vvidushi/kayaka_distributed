import admin from 'firebase-admin';
import { logger } from './logger.js';

let firebaseApp = null;

export const initializeFirebase = () => {
  if (!firebaseApp) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      logger.warn('Firebase service account not configured');
      return null;
    }

    try {
      const serviceAccountJson = JSON.parse(serviceAccount);
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });

      logger.info('Firebase Admin initialized');
    } catch (error) {
      logger.error('Firebase initialization error:', error);
      throw error;
    }
  }
  
  return firebaseApp;
};

export const getStorage = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.storage();
};

export const getBucket = () => {
  const storage = getStorage();
  return storage.bucket();
};

