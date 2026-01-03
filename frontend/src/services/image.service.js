import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const BUCKET_NAME = 'kayak';

const getEntityPath = (entityType, entityId) => {
  return `${BUCKET_NAME}/${entityType}/${entityId}`;
};

const getImagePath = (entityType, entityId, version, extension) => {
  return `${getEntityPath(entityType, entityId)}/${version}.${extension}`;
};

const getCurrentVersion = async (entityType, entityId) => {
  try {
    const folderRef = ref(storage, getEntityPath(entityType, entityId));
    const result = await listAll(folderRef);

    if (result.items.length === 0) {
      return 0;
    }

    const versions = result.items
      .map((item) => {
        const match = item.name.match(/^(\d+)\.\w+$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((v) => !isNaN(v));

    return versions.length > 0 ? Math.max(...versions) : 0;
  } catch (error) {
    return 0;
  }
};

const cleanupOldVersions = async (entityType, entityId, currentVersion) => {
  try {
    const folderRef = ref(storage, getEntityPath(entityType, entityId));
    const result = await listAll(folderRef);

    let versionsToDelete;
    
    if (entityType === 'profiles') {
      versionsToDelete = result.items
        .map((item) => {
          const match = item.name.match(/^(\d+)\.\w+$/);
          return match
            ? { version: parseInt(match[1], 10), ref: item }
            : null;
        })
        .filter((v) => v && v.version < currentVersion);
    } else {
      versionsToDelete = result.items
        .map((item) => {
          const match = item.name.match(/^(\d+)\.\w+$/);
          return match
            ? { version: parseInt(match[1], 10), ref: item }
            : null;
        })
        .filter((v) => v && v.version < currentVersion - 1);
    }

    if (versionsToDelete.length > 0) {
      const deletePromises = versionsToDelete.map(({ ref: itemRef }) =>
        deleteObject(itemRef)
      );
      await Promise.all(deletePromises);
    }
  } catch (error) {
    console.error('Error cleaning up old versions:', error);
  }
};

export const validateImageFile = (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB limit');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed');
  }

  return true;
};

const uploadEntityImage = async (file, entityType, entityId) => {
  validateImageFile(file);

  const currentVersion = await getCurrentVersion(entityType, entityId);
  const newVersion = currentVersion + 1;
  const fileExtension = file.name.split('.').pop();
  const fileName = getImagePath(entityType, entityId, newVersion, fileExtension);
  const storageRef = ref(storage, fileName);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    await cleanupOldVersions(entityType, entityId, newVersion);

    return {
      url: downloadURL,
      fileName,
      version: newVersion,
      size: file.size,
      contentType: file.type,
      entityType,
      entityId,
    };
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

export const uploadProfileImage = async (file, userId) => {
  validateImageFile(file);
  
  // Use the specific path format: kayak/profile/user_id/profile.jpg
  const fileExtension = file.name.split('.').pop().toLowerCase();
  const fileName = `kayak/profile/${userId}/profile.${fileExtension}`;
  const storageRef = ref(storage, fileName);

  try {
    // Delete old profile image if it exists (different extensions)
    try {
      const oldExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      for (const ext of oldExtensions) {
        if (ext !== fileExtension) {
          const oldFileRef = ref(storage, `kayak/profile/${userId}/profile.${ext}`);
          try {
            await deleteObject(oldFileRef);
          } catch (err) {
            // Ignore if file doesn't exist
          }
        }
      }
    } catch (err) {
      // Ignore cleanup errors
    }

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      fileName,
      size: file.size,
      contentType: file.type,
    };
  } catch (error) {
    throw new Error(`Failed to upload profile image: ${error.message}`);
  }
};

export const uploadFlightImage = async (file, flightId) => {
  return uploadEntityImage(file, 'flights', flightId);
};

export const uploadHotelImage = async (file, hotelId) => {
  return uploadEntityImage(file, 'hotels', hotelId);
};

export const uploadCarImage = async (file, carId) => {
  return uploadEntityImage(file, 'cars', carId);
};

export const uploadImage = async (file, folder = 'uploads') => {
  validateImageFile(file);
  const fileExtension = file.name.split('.').pop();
  const fileName = `kayak/${folder}/${Date.now()}.${fileExtension}`;
  const storageRef = ref(storage, fileName);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      fileName,
      size: file.size,
      contentType: file.type,
    };
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

export const uploadMultipleImages = async (files, folder = 'uploads') => {
  const uploadPromises = Array.from(files).map((file) => uploadImage(file, folder));
  return Promise.all(uploadPromises);
};

export const deleteImage = async (imageUrl) => {
  if (!imageUrl) {
    return;
  }

  try {
    const fileName = imageUrl.split('/o/')[1]?.split('?')[0];
    if (!fileName) {
      throw new Error('Invalid image URL');
    }

    const decodedFileName = decodeURIComponent(fileName);
    const storageRef = ref(storage, decodedFileName);
    await deleteObject(storageRef);
  } catch (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

export const deleteEntityImages = async (entityType, entityId) => {
  try {
    const folderRef = ref(storage, getEntityPath(entityType, entityId));
    const result = await listAll(folderRef);

    if (result.items.length > 0) {
      const deletePromises = result.items.map((item) => deleteObject(item));
      await Promise.all(deletePromises);
    }
  } catch (error) {
    throw new Error(`Failed to delete images: ${error.message}`);
  }
};

export const getImageUrl = async (fileName) => {
  if (!fileName) {
    return null;
  }

  if (fileName.startsWith('http')) {
    return fileName;
  }

  let path = fileName;
  if (!path.startsWith('kayak/')) {
    path = `kayak/${path}`;
  }

  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
};

export const getEntityImageUrl = async (entityType, entityId, version = null) => {
  if (!entityId) {
    return null;
  }

  if (version) {
    const match = version.toString().match(/^(\d+)\.(\w+)$/);
    if (match) {
      const [, ver, ext] = match;
      return await getImageUrl(getImagePath(entityType, entityId, parseInt(ver, 10), ext));
    }
  }

  return null;
};
