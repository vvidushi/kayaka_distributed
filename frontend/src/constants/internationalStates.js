// International States/Provinces including US, India, and other countries
// Format: { value: 'code', label: 'State/Province Name', country: 'Country' }

// US States
const US_STATES = [
  { value: 'US-AL', label: 'Alabama', country: 'United States' },
  { value: 'US-AK', label: 'Alaska', country: 'United States' },
  { value: 'US-AZ', label: 'Arizona', country: 'United States' },
  { value: 'US-AR', label: 'Arkansas', country: 'United States' },
  { value: 'US-CA', label: 'California', country: 'United States' },
  { value: 'US-CO', label: 'Colorado', country: 'United States' },
  { value: 'US-CT', label: 'Connecticut', country: 'United States' },
  { value: 'US-DE', label: 'Delaware', country: 'United States' },
  { value: 'US-FL', label: 'Florida', country: 'United States' },
  { value: 'US-GA', label: 'Georgia', country: 'United States' },
  { value: 'US-HI', label: 'Hawaii', country: 'United States' },
  { value: 'US-ID', label: 'Idaho', country: 'United States' },
  { value: 'US-IL', label: 'Illinois', country: 'United States' },
  { value: 'US-IN', label: 'Indiana', country: 'United States' },
  { value: 'US-IA', label: 'Iowa', country: 'United States' },
  { value: 'US-KS', label: 'Kansas', country: 'United States' },
  { value: 'US-KY', label: 'Kentucky', country: 'United States' },
  { value: 'US-LA', label: 'Louisiana', country: 'United States' },
  { value: 'US-ME', label: 'Maine', country: 'United States' },
  { value: 'US-MD', label: 'Maryland', country: 'United States' },
  { value: 'US-MA', label: 'Massachusetts', country: 'United States' },
  { value: 'US-MI', label: 'Michigan', country: 'United States' },
  { value: 'US-MN', label: 'Minnesota', country: 'United States' },
  { value: 'US-MS', label: 'Mississippi', country: 'United States' },
  { value: 'US-MO', label: 'Missouri', country: 'United States' },
  { value: 'US-MT', label: 'Montana', country: 'United States' },
  { value: 'US-NE', label: 'Nebraska', country: 'United States' },
  { value: 'US-NV', label: 'Nevada', country: 'United States' },
  { value: 'US-NH', label: 'New Hampshire', country: 'United States' },
  { value: 'US-NJ', label: 'New Jersey', country: 'United States' },
  { value: 'US-NM', label: 'New Mexico', country: 'United States' },
  { value: 'US-NY', label: 'New York', country: 'United States' },
  { value: 'US-NC', label: 'North Carolina', country: 'United States' },
  { value: 'US-ND', label: 'North Dakota', country: 'United States' },
  { value: 'US-OH', label: 'Ohio', country: 'United States' },
  { value: 'US-OK', label: 'Oklahoma', country: 'United States' },
  { value: 'US-OR', label: 'Oregon', country: 'United States' },
  { value: 'US-PA', label: 'Pennsylvania', country: 'United States' },
  { value: 'US-RI', label: 'Rhode Island', country: 'United States' },
  { value: 'US-SC', label: 'South Carolina', country: 'United States' },
  { value: 'US-SD', label: 'South Dakota', country: 'United States' },
  { value: 'US-TN', label: 'Tennessee', country: 'United States' },
  { value: 'US-TX', label: 'Texas', country: 'United States' },
  { value: 'US-UT', label: 'Utah', country: 'United States' },
  { value: 'US-VT', label: 'Vermont', country: 'United States' },
  { value: 'US-VA', label: 'Virginia', country: 'United States' },
  { value: 'US-WA', label: 'Washington', country: 'United States' },
  { value: 'US-WV', label: 'West Virginia', country: 'United States' },
  { value: 'US-WI', label: 'Wisconsin', country: 'United States' },
  { value: 'US-WY', label: 'Wyoming', country: 'United States' },
];

// Indian States and Union Territories
const INDIAN_STATES = [
  { value: 'IN-AP', label: 'Andhra Pradesh', country: 'India' },
  { value: 'IN-AR', label: 'Arunachal Pradesh', country: 'India' },
  { value: 'IN-AS', label: 'Assam', country: 'India' },
  { value: 'IN-BR', label: 'Bihar', country: 'India' },
  { value: 'IN-CT', label: 'Chhattisgarh', country: 'India' },
  { value: 'IN-GA', label: 'Goa', country: 'India' },
  { value: 'IN-GJ', label: 'Gujarat', country: 'India' },
  { value: 'IN-HR', label: 'Haryana', country: 'India' },
  { value: 'IN-HP', label: 'Himachal Pradesh', country: 'India' },
  { value: 'IN-JK', label: 'Jammu and Kashmir', country: 'India' },
  { value: 'IN-JH', label: 'Jharkhand', country: 'India' },
  { value: 'IN-KA', label: 'Karnataka', country: 'India' },
  { value: 'IN-KL', label: 'Kerala', country: 'India' },
  { value: 'IN-MP', label: 'Madhya Pradesh', country: 'India' },
  { value: 'IN-MH', label: 'Maharashtra', country: 'India' },
  { value: 'IN-MN', label: 'Manipur', country: 'India' },
  { value: 'IN-ML', label: 'Meghalaya', country: 'India' },
  { value: 'IN-MZ', label: 'Mizoram', country: 'India' },
  { value: 'IN-NL', label: 'Nagaland', country: 'India' },
  { value: 'IN-OR', label: 'Odisha', country: 'India' },
  { value: 'IN-PB', label: 'Punjab', country: 'India' },
  { value: 'IN-RJ', label: 'Rajasthan', country: 'India' },
  { value: 'IN-SK', label: 'Sikkim', country: 'India' },
  { value: 'IN-TN', label: 'Tamil Nadu', country: 'India' },
  { value: 'IN-TG', label: 'Telangana', country: 'India' },
  { value: 'IN-TR', label: 'Tripura', country: 'India' },
  { value: 'IN-UP', label: 'Uttar Pradesh', country: 'India' },
  { value: 'IN-UT', label: 'Uttarakhand', country: 'India' },
  { value: 'IN-WB', label: 'West Bengal', country: 'India' },
  { value: 'IN-AN', label: 'Andaman and Nicobar Islands', country: 'India' },
  { value: 'IN-CH', label: 'Chandigarh', country: 'India' },
  { value: 'IN-DH', label: 'Dadra and Nagar Haveli and Daman and Diu', country: 'India' },
  { value: 'IN-DL', label: 'Delhi', country: 'India' },
  { value: 'IN-LD', label: 'Lakshadweep', country: 'India' },
  { value: 'IN-PY', label: 'Puducherry', country: 'India' },
];

// Canadian Provinces
const CANADIAN_PROVINCES = [
  { value: 'CA-AB', label: 'Alberta', country: 'Canada' },
  { value: 'CA-BC', label: 'British Columbia', country: 'Canada' },
  { value: 'CA-MB', label: 'Manitoba', country: 'Canada' },
  { value: 'CA-NB', label: 'New Brunswick', country: 'Canada' },
  { value: 'CA-NL', label: 'Newfoundland and Labrador', country: 'Canada' },
  { value: 'CA-NS', label: 'Nova Scotia', country: 'Canada' },
  { value: 'CA-ON', label: 'Ontario', country: 'Canada' },
  { value: 'CA-PE', label: 'Prince Edward Island', country: 'Canada' },
  { value: 'CA-QC', label: 'Quebec', country: 'Canada' },
  { value: 'CA-SK', label: 'Saskatchewan', country: 'Canada' },
  { value: 'CA-NT', label: 'Northwest Territories', country: 'Canada' },
  { value: 'CA-NU', label: 'Nunavut', country: 'Canada' },
  { value: 'CA-YT', label: 'Yukon', country: 'Canada' },
];

// UK Countries/Regions
const UK_REGIONS = [
  { value: 'GB-ENG', label: 'England', country: 'United Kingdom' },
  { value: 'GB-SCT', label: 'Scotland', country: 'United Kingdom' },
  { value: 'GB-WLS', label: 'Wales', country: 'United Kingdom' },
  { value: 'GB-NIR', label: 'Northern Ireland', country: 'United Kingdom' },
];

// Australian States
const AUSTRALIAN_STATES = [
  { value: 'AU-NSW', label: 'New South Wales', country: 'Australia' },
  { value: 'AU-VIC', label: 'Victoria', country: 'Australia' },
  { value: 'AU-QLD', label: 'Queensland', country: 'Australia' },
  { value: 'AU-WA', label: 'Western Australia', country: 'Australia' },
  { value: 'AU-SA', label: 'South Australia', country: 'Australia' },
  { value: 'AU-TAS', label: 'Tasmania', country: 'Australia' },
  { value: 'AU-NT', label: 'Northern Territory', country: 'Australia' },
  { value: 'AU-ACT', label: 'Australian Capital Territory', country: 'Australia' },
];

// Combine all states
export const ALL_STATES = [
  ...US_STATES,
  ...INDIAN_STATES,
  ...CANADIAN_PROVINCES,
  ...UK_REGIONS,
  ...AUSTRALIAN_STATES,
];

// Export US_STATES for backward compatibility
export const US_STATES_ONLY = US_STATES.map(s => ({ value: s.value.replace('US-', ''), label: s.label }));

// Helper function to get states by country
export const getStatesByCountry = (country) => {
  return ALL_STATES.filter(state => state.country === country);
};

// Helper function to get all unique countries
export const getCountries = () => {
  const countries = [...new Set(ALL_STATES.map(state => state.country))];
  return countries.sort();
};

