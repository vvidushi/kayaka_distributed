import {
  PROFILE_TYPES,
  PROFILE_TYPE_VALUES,
} from '../constants/profileTypes.js';

export const normalizeProfileType = (profileType) =>
  PROFILE_TYPE_VALUES.includes(profileType) ? profileType : PROFILE_TYPES.TRAVELER;

export const normalizePartnerDetails = (profileType, partnerDetails) => {
  // Check if this is an owner/property_owner profile
  const isOwner = profileType === PROFILE_TYPES.OWNER || profileType === PROFILE_TYPES.PROPERTY_OWNER;
  
  if (!isOwner) {
    return null;
  }

  if (!partnerDetails) {
    // Owner accounts can exist without partner details for now
    return null;
  }

  // Handle both old format (companyName) and new format (businessName)
  const {
    companyName,
    businessName,
    contactName,
    contactEmail,
    portfolioSize,
    website,
    businessType,
    taxId,
    businessAddress,
    contactPhone,
  } = partnerDetails;

  const name = businessName || companyName;
  
  if (name && name.trim()) {
    return {
      businessName: name.trim(),
      businessType: businessType || null,
      taxId: taxId || null,
      businessAddress: businessAddress || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      contactName: contactName?.trim() || null,
      website: website?.trim() || null,
      portfolioSize: portfolioSize || null,
    };
  }

  return null;
};
