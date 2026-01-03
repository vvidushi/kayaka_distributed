export const PROFILE_TYPES = Object.freeze({
  TRAVELER: 'traveler',
  OWNER: 'owner', // Updated to match frontend
  PROPERTY_OWNER: 'property_owner', // Legacy support
});

export const PROFILE_TYPE_VALUES = ['traveler', 'owner', 'property_owner'];

export const doesProfileRequireSsn = (profileType) =>
  profileType === PROFILE_TYPES.OWNER || profileType === PROFILE_TYPES.PROPERTY_OWNER;
