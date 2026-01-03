/**
 * Convert MongoDB ObjectId (24 hex chars) to UUID format
 * MongoDB ObjectId: 692a35f0e3b7ad6e9483828c (24 chars)
 * UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
 * 
 * Strategy: Take first 32 hex chars and format as UUID
 */
export const objectIdToUUID = (objectId) => {
  if (!objectId || typeof objectId !== 'string') {
    return objectId;
  }

  // Check if it's already a UUID (has dashes)
  if (objectId.includes('-')) {
    return objectId;
  }

  // Check if it's a MongoDB ObjectId (24 hex chars)
  if (/^[0-9a-f]{24}$/i.test(objectId)) {
    // Convert 24-char ObjectId to UUID format
    // Take first 32 chars (pad if needed) and format as UUID
    const hex = objectId.padEnd(32, '0').substring(0, 32);
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
  }

  // If it's already a valid UUID format, return as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(objectId)) {
    return objectId;
  }

  // Return as-is if we can't determine the format
  return objectId;
};

