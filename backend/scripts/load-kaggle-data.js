import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { logger } from '../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Main script to load real Kaggle datasets into MongoDB
 * 
 * Data Sources:
 * 1. Flights: Flight Price Prediction (EaseMyTrip) + Expedia Flight Prices
 * 2. Hotels: Inside Airbnb NYC + Hotel Booking Demand
 * 3. Airports: Global Airports (IATA/ICAO/coords/timezone)
 * 
 * Instructions:
 * 1. Download datasets from Kaggle (see README in this directory)
 * 2. Place CSV files in backend/scripts/data/ directory
 * 3. Run: npm run load:kaggle-data
 */

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Helper: Read CSV file
 */
const readCSV = (filename) => {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    logger.warn(`CSV file not found: ${filename}`);
    return [];
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
};

/**
 * Helper: Generate dates from November 30, 2025 to February 28, 2026
 */
const generateFutureDates = () => {
  const dates = [];
  const startDate = new Date('2025-11-30');
  const endDate = new Date('2026-02-28'); // End of February 2026
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

/**
 * Helper: Generate time string (HH:MM)
 */
const generateTime = () => {
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

/**
 * Helper: Generate flight number (airline code + 3-4 digit number)
 */
const generateFlightNumber = (airlineName) => {
  // Map airline names to IATA codes
  const airlineCodes = {
    'American Airlines': 'AA',
    'Delta Air Lines': 'DL',
    'United Airlines': 'UA',
    'Southwest Airlines': 'WN',
    'JetBlue Airways': 'B6',
    'Alaska Airlines': 'AS',
    'Spirit Airlines': 'NK',
    'Frontier Airlines': 'F9',
  };
  const code = airlineCodes[airlineName] || 'XX';
  const flightNum = Math.floor(100 + Math.random() * 9900); // 100-9999
  return `${code}${flightNum}`;
};

/**
 * Helper: Generate random flight class with weighted distribution
 * 60% economy, 20% premium_economy, 15% business, 5% first
 */
const getRandomFlightClass = () => {
  const rand = Math.random();
  if (rand < 0.6) return 'economy';
  if (rand < 0.8) return 'premium_economy';
  if (rand < 0.95) return 'business';
  return 'first';
};

/**
 * Helper: Calculate price multiplier based on class
 */
const getClassPriceMultiplier = (flightClass) => {
  switch (flightClass) {
    case 'economy': return 1.0;
    case 'premium_economy': return 1.5;
    case 'business': return 2.5;
    case 'first': return 4.0;
    default: return 1.0;
  }
};

/**
 * Helper: Generate total seats based on aircraft type
 */
const getTotalSeats = () => {
  const size = Math.random();
  if (size < 0.3) return 100 + Math.floor(Math.random() * 50); // 100-150
  if (size < 0.7) return 150 + Math.floor(Math.random() * 50); // 150-200
  return 200 + Math.floor(Math.random() * 100); // 200-300
};

/**
 * Load airports data from Global Airports dataset
 */
const loadAirports = async () => {
  logger.info('Loading airports data...');
  
  // Read airports.csv from Kaggle dataset
  const airportsData = readCSV('airports.csv');
  
  if (airportsData.length === 0) {
    logger.warn('No airports data found, using default US airports');
    return getDefaultAirports();
  }
  
  // Try to parse airports - handle different CSV formats
  let usAirports = [];
  
  // Check if it's OpenFlights format (Name,City,Country,IATA,ICAO,Latitude,Longitude,Altitude,Timezone)
  if (airportsData[0].IATA || airportsData[0].iata_code) {
    usAirports = airportsData
      .filter(row => {
        const country = (row.Country || row.country || row.iso_country || '').toLowerCase();
        const iata = (row.IATA || row.iata_code || '').trim();
        return (country === 'united states' || country === 'us' || country.includes('united states') || row.iso_country === 'US') && 
               iata && iata.length === 3 && iata !== '\\N' && iata !== '';
      })
      .map(row => {
        const iata = (row.IATA || row.iata_code || '').trim();
        if (!iata || iata === '\\N' || iata.length !== 3) return null;
        
        // Map major cities to states for US airports (OpenFlights format doesn't have state)
        const cityToState = {
          'New York': 'NY', 'Los Angeles': 'CA', 'San Francisco': 'CA', 'Chicago': 'IL',
          'Dallas': 'TX', 'Denver': 'CO', 'Atlanta': 'GA', 'Las Vegas': 'NV',
          'Seattle': 'WA', 'Miami': 'FL', 'Boston': 'MA', 'Phoenix': 'AZ',
          'Houston': 'TX', 'Orlando': 'FL', 'Newark': 'NJ', 'Washington': 'DC',
          'Baltimore': 'MD', 'Salt Lake City': 'UT', 'Detroit': 'MI', 'Philadelphia': 'PA',
          'Minneapolis': 'MN', 'Nashville': 'TN', 'Austin': 'TX', 'Raleigh': 'NC',
          'Sacramento': 'CA', 'Portland': 'OR', 'Tampa': 'FL', 'St. Louis': 'MO',
          'San Diego': 'CA', 'Honolulu': 'HI', 'Charlotte': 'NC', 'Oakland': 'CA',
        };
        
        const cityName = (row.City || row.city || row.municipality || 'Unknown').trim();
        const state = row.State || row.state || row.iso_region?.split('-')[1] || cityToState[cityName] || 'Unknown';
        
        return {
          code: iata.toUpperCase(),
          name: row.Name || row.name || 'Unknown',
          city: cityName,
          state: state,
          country: row.Country || row.country || row.iso_country || 'US',
          lat: parseFloat(row.Latitude || row.latitude || row.latitude_deg || 0),
          lng: parseFloat(row.Longitude || row.longitude || row.longitude_deg || 0),
          elevation: parseInt(row.Altitude || row.altitude || row.elevation_ft || 0),
          timezone: row.Timezone || row.timezone || 'America/New_York',
        };
      })
      .filter(airport => airport !== null);
  } else {
    // Try original format (iso_country, iata_code, etc.)
    usAirports = airportsData
      .filter(row => 
        row.iso_country === 'US' && 
        row.iata_code && 
        row.iata_code.length === 3 &&
        row.type && 
        (row.type.includes('large_airport') || row.type.includes('medium_airport'))
      )
      .map(row => ({
        code: row.iata_code.toUpperCase(),
        name: row.name,
        city: row.municipality || 'Unknown',
        state: row.iso_region?.split('-')[1] || 'Unknown',
        country: row.iso_country,
        lat: parseFloat(row.latitude_deg) || 0,
        lng: parseFloat(row.longitude_deg) || 0,
        elevation: parseInt(row.elevation_ft) || 0,
        timezone: row.timezone || 'America/New_York',
      }));
  }
  
  if (usAirports.length === 0) {
    logger.warn('No US airports found in CSV, using default US airports');
    return getDefaultAirports();
  }
  
  logger.info(`Loaded ${usAirports.length} US airports`);
  return usAirports;
};

/**
 * Default airports if CSV not available
 */
const getDefaultAirports = () => {
  return [
    { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International', state: 'CA', lat: 33.9425, lng: -118.4081 },
    { code: 'JFK', city: 'New York', name: 'John F. Kennedy International', state: 'NY', lat: 40.6413, lng: -73.7781 },
    { code: 'SFO', city: 'San Francisco', name: 'San Francisco International', state: 'CA', lat: 37.6213, lng: -122.3790 },
    { code: 'ORD', city: 'Chicago', name: 'O\'Hare International', state: 'IL', lat: 41.9742, lng: -87.9073 },
    { code: 'DFW', city: 'Dallas', name: 'Dallas/Fort Worth International', state: 'TX', lat: 32.8998, lng: -97.0403 },
    { code: 'DEN', city: 'Denver', name: 'Denver International', state: 'CO', lat: 39.8561, lng: -104.6737 },
    { code: 'ATL', city: 'Atlanta', name: 'Hartsfield-Jackson Atlanta International', state: 'GA', lat: 33.6407, lng: -84.4277 },
    { code: 'LAS', city: 'Las Vegas', name: 'Harry Reid International', state: 'NV', lat: 36.0840, lng: -115.1537 },
    { code: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma International', state: 'WA', lat: 47.4502, lng: -122.3088 },
    { code: 'MIA', city: 'Miami', name: 'Miami International', state: 'FL', lat: 25.7959, lng: -80.2870 },
    { code: 'BOS', city: 'Boston', name: 'Logan International', state: 'MA', lat: 42.3656, lng: -71.0096 },
    { code: 'PHX', city: 'Phoenix', name: 'Phoenix Sky Harbor International', state: 'AZ', lat: 33.4342, lng: -112.0116 },
    { code: 'IAH', city: 'Houston', name: 'George Bush Intercontinental', state: 'TX', lat: 29.9902, lng: -95.3368 },
    { code: 'MCO', city: 'Orlando', name: 'Orlando International', state: 'FL', lat: 28.4312, lng: -81.3083 },
    { code: 'EWR', city: 'Newark', name: 'Newark Liberty International', state: 'NJ', lat: 40.6895, lng: -74.1745 },
  ];
};

/**
 * Load flights from Kaggle datasets
 */
const loadFlights = async (airports) => {
  logger.info('Loading flights data...');
  
  // Try to read from multiple possible Kaggle datasets
  let flightData = readCSV('Clean_Dataset.csv'); // EaseMyTrip dataset
  if (flightData.length === 0) {
    flightData = readCSV('itineraries.csv'); // Expedia dataset
  }
  
  const flights = [];
  const flightIdCounter = { count: 1001 };
  const futureDates = generateFutureDates();
  
  // Get major airports for routes
  const majorAirports = airports.length > 0 ? airports.slice(0, 20) : getDefaultAirports().slice(0, 20);
  
  if (flightData.length === 0) {
    logger.warn('No flight data from CSV, generating synthetic flights based on airports');
    return generateSyntheticFlights(airports.length > 0 ? airports : getDefaultAirports(), futureDates, flightIdCounter);
  }
  
  logger.info(`Processing ${flightData.length} flight records from Kaggle dataset`);
  
  // Process real flight data
  const airlines = ['American Airlines', 'Delta Air Lines', 'United Airlines', 'Southwest Airlines', 
                   'JetBlue Airways', 'Alaska Airlines', 'Spirit Airlines', 'Frontier Airlines'];
  
  // Sample and duplicate flights across future dates
  const sampleSize = Math.min(flightData.length, 500); // Use up to 500 unique routes
  const sampledFlights = flightData.slice(0, sampleSize);
  
  // Helper function to find airport by city name
  const findAirportByCity = (cityName) => {
    if (!cityName) return null;
    const normalizedCity = cityName.toLowerCase().trim();
    // Try exact match first
    let airport = airports.find(a => a.city.toLowerCase() === normalizedCity);
    // Try partial match
    if (!airport) {
      airport = airports.find(a => a.city.toLowerCase().includes(normalizedCity) || normalizedCity.includes(a.city.toLowerCase()));
    }
    return airport;
  };

  sampledFlights.forEach((row, idx) => {
    // Extract flight info from CSV (columns vary by dataset)
    // Clean_Dataset.csv has: source_city, destination_city (city names, not codes)
    // Map city names to airport codes using loaded airports
    let from = row.source || row.origin;
    let to = row.destination || row.dest;
    
    // If we have city names instead of codes, find matching airport
    if (row.source_city && !from) {
      const fromAirport = findAirportByCity(row.source_city);
      from = fromAirport ? fromAirport.code : (majorAirports.length > 0 ? majorAirports[idx % majorAirports.length].code : 'LAX');
    }
    if (row.destination_city && !to) {
      const toAirport = findAirportByCity(row.destination_city);
      to = toAirport ? toAirport.code : (majorAirports.length > 0 ? majorAirports[(idx + 5) % majorAirports.length].code : 'JFK');
    }
    
    // Fallback to major airports if still no codes or invalid codes
    if (!from || from.length !== 3) {
      from = majorAirports.length > 0 ? majorAirports[idx % majorAirports.length].code : 'LAX';
    }
    if (!to || to.length !== 3) {
      to = majorAirports.length > 0 ? majorAirports[(idx + 5) % majorAirports.length].code : 'JFK';
    }
    
    const airline = row.airline || airlines[Math.floor(Math.random() * airlines.length)];
    
    // Handle stops - Clean_Dataset.csv has "zero" as text
    let stops = 0;
    if (row.stops || row.stop) {
      const stopsValue = (row.stops || row.stop).toString().toLowerCase();
      stops = stopsValue === 'zero' || stopsValue === '0' ? 0 : parseInt(stopsValue) || 1;
    }
    
    // Handle duration - Clean_Dataset.csv has duration in hours (e.g., 2.17)
    let duration = 180; // default
    if (row.duration || row.duration_minutes) {
      const durValue = parseFloat(row.duration || row.duration_minutes);
      // If duration < 10, assume it's in hours, convert to minutes
      duration = durValue < 10 ? Math.round(durValue * 60) : Math.round(durValue);
    }
    
    const basePrice = parseFloat(row.price || row.fare || (150 + Math.random() * 300));
    
    // Extract or generate flight class from CSV - Clean_Dataset.csv has "Economy" (capitalized)
    const csvClass = row.class || row.class_type;
    let flightClass = getRandomFlightClass();
    if (csvClass) {
      const normalized = csvClass.toLowerCase().trim().replace(/\s+/g, '_');
      if (['economy', 'premium_economy', 'business', 'first'].includes(normalized)) {
        flightClass = normalized;
      } else if (normalized.includes('economy')) {
        flightClass = normalized.includes('premium') ? 'premium_economy' : 'economy';
      } else if (normalized.includes('business')) {
        flightClass = 'business';
      } else if (normalized.includes('first')) {
        flightClass = 'first';
      }
    }
    const classMultiplier = getClassPriceMultiplier(flightClass);
    
    // Validate airport codes - must exist in airports list
    const fromAirport = airports.find(a => a.code === from.toUpperCase());
    const toAirport = airports.find(a => a.code === to.toUpperCase());
    
    if (!fromAirport || !toAirport) {
      // Skip if airports not found in our airports list
      return;
    }
    
    // Generate flights for all dates in range (Nov 30, 2025 - Feb 28, 2026)
    const selectedDates = futureDates;
    
    selectedDates.forEach(date => {
      const flightsPerDay = 2 + Math.floor(Math.random() * 2); // 2-3 flights per day
      
      for (let i = 0; i < flightsPerDay; i++) {
        // Generate flight number - use from CSV if available, otherwise generate
        const flightNumber = row.flight || generateFlightNumber(airline);
        
        // Generate seats
        const totalSeats = getTotalSeats();
        const availableSeats = Math.floor(totalSeats * (0.2 + Math.random() * 0.75)); // 20-95% available
        
        // Add price variation (±20%) and apply class multiplier
        const priceVariation = 0.8 + Math.random() * 0.4;
        const classAdjustedPrice = basePrice * classMultiplier;
        const finalPrice = Math.round(classAdjustedPrice * priceVariation * 100) / 100;
        
        // Deal detection: 15% chance of being a deal (price <= 85% of base)
        const isDeal = Math.random() < 0.15;
        const dealPrice = isDeal ? Math.round(classAdjustedPrice * 0.75 * 100) / 100 : finalPrice;
        
        flights.push({
          _id: `FL-${flightIdCounter.count++}`,
          id: `FL-${flightIdCounter.count - 1}`,
          from,
          to,
          departDate: date.toISOString().split('T')[0],
          returnDate: null,
          airline,
          flightNumber,
          durationMinutes: duration,
          price: Math.max(99, dealPrice),
          currency: 'USD',
          class: flightClass,
          nonstop: stops === 0,
          stops,
          totalSeats,
          availableSeats,
          departureTime: generateTime(),
          arrivalTime: generateTime(),
          
          // Deal metadata
          isDeal: isDeal,
          avgPrice: classAdjustedPrice,
          savingsPercent: isDeal ? Math.round((1 - dealPrice / classAdjustedPrice) * 100) : 0,
          
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });
  });
  
  logger.info(`Generated ${flights.length} flights from Kaggle data`);
  return flights;
};

/**
 * Generate synthetic flights if no CSV available
 */
const generateSyntheticFlights = (airports, futureDates, flightIdCounter) => {
  logger.info('Generating synthetic flights...');
  
  const flights = [];
  const airlines = ['American Airlines', 'Delta Air Lines', 'United Airlines', 'Southwest Airlines', 
                   'JetBlue Airways', 'Alaska Airlines', 'Spirit Airlines', 'Frontier Airlines'];
  
  const majorAirports = airports.slice(0, 15);
  const routes = [];
  
  // Generate routes between major airports
  for (let i = 0; i < majorAirports.length; i++) {
    for (let j = i + 1; j < majorAirports.length; j++) {
      routes.push([majorAirports[i].code, majorAirports[j].code]);
      routes.push([majorAirports[j].code, majorAirports[i].code]);
    }
  }
  
  // Generate flights for each route and date (Nov 30, 2025 - Feb 28, 2026)
  const selectedDates = futureDates;
  
  routes.forEach(([from, to]) => {
    const baseDuration = 90 + Math.random() * 240;
    const basePrice = 150 + Math.random() * 300;
    
    selectedDates.forEach(date => {
      const flightsPerDay = 2 + Math.floor(Math.random() * 2);
      
      for (let i = 0; i < flightsPerDay; i++) {
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const nonstop = Math.random() > 0.3;
        const flightClass = getRandomFlightClass();
        const classMultiplier = getClassPriceMultiplier(flightClass);
        const flightNumber = generateFlightNumber(airline);
        const totalSeats = getTotalSeats();
        const availableSeats = Math.floor(totalSeats * (0.2 + Math.random() * 0.75));
        const priceVariation = 0.8 + Math.random() * 0.4;
        const classAdjustedPrice = basePrice * classMultiplier;
        const price = Math.round(classAdjustedPrice * priceVariation * 100) / 100;
        
        flights.push({
          _id: `FL-${flightIdCounter.count++}`,
          id: `FL-${flightIdCounter.count - 1}`,
          from,
          to,
          departDate: date.toISOString().split('T')[0],
          returnDate: null,
          airline,
          flightNumber,
          durationMinutes: Math.round(baseDuration),
          price: Math.max(99, price),
          currency: 'USD',
          class: flightClass,
          nonstop,
          stops: nonstop ? 0 : 1,
          totalSeats,
          availableSeats,
          departureTime: generateTime(),
          arrivalTime: generateTime(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });
  });
  
  return flights;
};

/**
 * Load hotels from Kaggle datasets (Airbnb + Hotel Booking)
 */
const loadHotels = async (airports) => {
  logger.info('Loading hotels data...');
  
  // Try reading Airbnb listings
  let hotelData = readCSV('listings.csv'); // Inside Airbnb NYC
  if (hotelData.length === 0) {
    hotelData = readCSV('hotel_bookings.csv'); // Hotel Booking Demand
  }
  
  const hotels = [];
  const hotelIdCounter = { count: 2001 };
  
  // Get major cities
  const majorCities = airports.slice(0, 25);
  
  if (hotelData.length === 0) {
    logger.warn('No hotel data from CSV, generating synthetic hotels');
    return generateSyntheticHotels(majorCities, hotelIdCounter);
  }
  
  logger.info(`Processing ${hotelData.length} hotel/listing records from Kaggle dataset`);
  
  // Process real hotel data
  const amenitiesList = ['wifi', 'breakfast', 'parking', 'gym', 'pool', 'spa', 
                         'restaurant', 'bar', 'room_service', 'pet_friendly', 'kitchen'];
  
  const sampleSize = Math.min(hotelData.length, 1000);
  const sampledHotels = hotelData.slice(0, sampleSize);
  
  sampledHotels.forEach((row, idx) => {
    // Extract hotel info (columns vary by dataset)
    // listings.csv has: name, neighbourhood (not neighbourhood_cleansed), price
    const name = row.name || row.hotel || `Hotel ${idx + 1}`;
    let city = row.neighbourhood_cleansed || row.neighbourhood || row.city;
    let state = 'NY'; // Default to NY for Airbnb NYC dataset
    
    // If city not found, use major cities
    if (!city) {
      const cityData = majorCities[idx % majorCities.length];
      city = cityData.city;
      state = cityData.state || 'NY';
    } else {
      // Map NYC neighbourhoods to state
      // listings.csv is NYC data, so state should be NY
      if (row.neighbourhood_group === 'Manhattan' || row.neighbourhood_group === 'Brooklyn' || 
          row.neighbourhood_group === 'Queens' || row.neighbourhood_group === 'Bronx' || 
          row.neighbourhood_group === 'Staten Island') {
        state = 'NY';
      } else if (majorCities.length > 0) {
        // Try to find matching city in airports
        const cityMatch = majorCities.find(c => c.city.toLowerCase() === city.toLowerCase());
        state = cityMatch ? (cityMatch.state || 'NY') : 'NY';
      }
    }
    
    // Price extraction - listings.csv price might need parsing
    let pricePerNight = parseFloat((row.price || row.adr || '0').toString().replace(/[$,]/g, ''));
    if (isNaN(pricePerNight) || pricePerNight <= 0) {
      pricePerNight = 80 + Math.random() * 200;
    }
    if (pricePerNight > 1000) pricePerNight = pricePerNight / 10; // Adjust if needed
    pricePerNight = Math.max(50, Math.round(pricePerNight * 100) / 100);
    
    // Rating - listings.csv doesn't have review_scores_rating, calculate from number_of_reviews
    let rating = 3.5 + Math.random() * 1.5; // default
    if (row.review_scores_rating) {
      rating = parseFloat(row.review_scores_rating);
    } else if (row.number_of_reviews) {
      // Estimate rating based on review count (more reviews = likely better)
      const reviewCount = parseInt(row.number_of_reviews) || 0;
      rating = reviewCount > 50 ? 4.0 + Math.random() * 1.0 : 3.5 + Math.random() * 1.5;
    }
    const normalizedRating = rating > 10 ? rating / 20 : rating; // Normalize to 0-5 scale
    
    // Amenities from Airbnb data
    let selectedAmenities = [];
    if (row.amenities) {
      const rawAmenities = row.amenities.toLowerCase();
      selectedAmenities = amenitiesList.filter(a => rawAmenities.includes(a));
    }
    if (selectedAmenities.length === 0) {
      // Random amenities if not available
      const numAmenities = 3 + Math.floor(Math.random() * 5);
      selectedAmenities = amenitiesList.sort(() => 0.5 - Math.random()).slice(0, numAmenities);
    }
    
    // Coordinates
    const lat = parseFloat(row.latitude) || majorCities[idx % majorCities.length].lat + (Math.random() - 0.5) * 0.1;
    const lng = parseFloat(row.longitude) || majorCities[idx % majorCities.length].lng + (Math.random() - 0.5) * 0.1;
    
    // Deal detection
    const cityMedianPrice = 150;
    const isDeal = pricePerNight <= cityMedianPrice * 0.85;
    
    // Availability (from Airbnb data) - listings.csv has availability_365
    const availability = parseInt(row.availability_30 || row.availability_365 || 25);
    const limitedAvailability = availability < 5;
    
    hotels.push({
      _id: `HT-${hotelIdCounter.count++}`,
      id: `HT-${hotelIdCounter.count - 1}`,
      city,
      state,
      name: name.substring(0, 100), // Limit name length
      rating: Math.min(5, Math.max(0, Math.round(normalizedRating * 10) / 10)),
      pricePerNight,
      currency: 'USD',
      amenities: selectedAmenities,
      lat,
      lng,
      
      // Deal metadata
      isDeal,
      limitedAvailability,
      availableRooms: availability,
      tags: [
        ...selectedAmenities.slice(0, 3).map(a => a.replace('_', ' ')),
        limitedAvailability ? 'Limited Availability' : null,
        isDeal ? 'Great Deal' : null,
      ].filter(Boolean),
      
      // Neighborhood/location from Airbnb
      neighbourhood: row.neighbourhood_cleansed || row.neighbourhood || null,
      
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
  
  logger.info(`Generated ${hotels.length} hotels from Kaggle data`);
  return hotels;
};

/**
 * Generate synthetic hotels if no CSV available
 */
const generateSyntheticHotels = (cities, hotelIdCounter) => {
  logger.info('Generating synthetic hotels...');
  
  const hotels = [];
  const hotelChains = ['Marriott', 'Hilton', 'Hyatt', 'Holiday Inn', 'Best Western', 
                       'Sheraton', 'Westin', 'Radisson'];
  const hotelSuffixes = ['Grand Hotel', 'Plaza', 'Inn', 'Resort', 'Suites', 'Lodge'];
  const amenities = ['wifi', 'breakfast', 'parking', 'gym', 'pool', 'spa', 
                     'restaurant', 'bar', 'room_service', 'pet_friendly'];
  
  cities.forEach(city => {
    const numHotels = 4 + Math.floor(Math.random() * 4); // 4-7 hotels per city
    
    for (let i = 0; i < numHotels; i++) {
      const chain = hotelChains[Math.floor(Math.random() * hotelChains.length)];
      const suffix = hotelSuffixes[Math.floor(Math.random() * hotelSuffixes.length)];
      const name = `${chain} ${city.city} ${suffix}`;
      
      const rating = 3.5 + Math.random() * 1.5;
      const pricePerNight = Math.round((80 + Math.random() * 200) * 100) / 100;
      
      const numAmenities = 3 + Math.floor(Math.random() * 5);
      const selectedAmenities = amenities.sort(() => 0.5 - Math.random()).slice(0, numAmenities);
      
      const lat = city.lat + (Math.random() - 0.5) * 0.1;
      const lng = city.lng + (Math.random() - 0.5) * 0.1;
      
      hotels.push({
        _id: `HT-${hotelIdCounter.count++}`,
        id: `HT-${hotelIdCounter.count - 1}`,
        city: city.city,
        state: city.state,
        name,
        rating: Math.round(rating * 10) / 10,
        pricePerNight,
        currency: 'USD',
        amenities: selectedAmenities,
        lat,
        lng,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });
  
  return hotels;
};

/**
 * Load cars (synthetic based on airports/cities)
 */
const loadCars = async (airports) => {
  logger.info('Loading cars data...');
  
  const cars = [];
  const carIdCounter = { count: 3001 };
  
  const vendors = ['Hertz', 'Avis', 'Enterprise', 'Budget', 'National', 'Alamo', 'Thrifty'];
  const carTypes = [
    { type: 'Economy', seats: 4, basePrice: 35 },
    { type: 'Compact', seats: 4, basePrice: 40 },
    { type: 'Mid-size', seats: 5, basePrice: 50 },
    { type: 'Full-size', seats: 5, basePrice: 60 },
    { type: 'SUV', seats: 7, basePrice: 75 },
    { type: 'Luxury', seats: 5, basePrice: 100 },
  ];
  
  // Generate cars for major cities
  const majorCities = airports.slice(0, 25);
  
  majorCities.forEach(city => {
    const numCars = 4 + Math.floor(Math.random() * 3); // 4-6 cars per city
    
    for (let i = 0; i < numCars; i++) {
      const vendor = vendors[Math.floor(Math.random() * vendors.length)];
      const carType = carTypes[Math.floor(Math.random() * carTypes.length)];
      
      const pricePerDay = Math.round((carType.basePrice + Math.random() * 20) * 100) / 100;
      
      cars.push({
        _id: `CR-${carIdCounter.count++}`,
        id: `CR-${carIdCounter.count - 1}`,
        city: city.city,
        state: city.state,
        vendor,
        type: carType.type,
        seats: carType.seats,
        pricePerDay,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });
  
  logger.info(`Generated ${cars.length} cars`);
  return cars;
};

/**
 * Main function to seed database
 */
const seedDatabase = async (options = {}) => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Step 1: Load airports (reference data)
    console.log('\nStep 1: Loading airports...');
    const airports = await loadAirports();
    console.log(`   Loaded ${airports.length} airports`);
    
    // Store airports in MongoDB for lookup
    if (airports.length > 0 && options.clear !== false) {
      console.log('   Storing airports in database...');
      await db.collection('airports').deleteMany({});
      await db.collection('airports').insertMany(airports);
      await db.collection('airports').createIndex({ code: 1 }, { unique: true });
      console.log(`   Stored ${airports.length} airports`);
    } else if (airports.length > 0 && options.clear === false) {
      // If not clearing, upsert airports (update existing, insert new)
      console.log('   Upserting airports in database...');
      for (const airport of airports) {
        await db.collection('airports').updateOne(
          { code: airport.code },
          { $set: airport },
          { upsert: true }
        );
      }
      await db.collection('airports').createIndex({ code: 1 }, { unique: true });
      console.log(`   Upserted ${airports.length} airports`);
    }
    
    // Step 2: Load flights
    console.log('\nStep 2: Loading flights...');
    const flights = await loadFlights(airports);
    console.log(`   Generated ${flights.length} flights`);
    
    // Step 3: Load hotels
    console.log('\nStep 3: Loading hotels...');
    const hotels = await loadHotels(airports);
    console.log(`   Generated ${hotels.length} hotels`);
    
    // Step 4: Load cars
    console.log('\nStep 4: Loading cars...');
    const cars = await loadCars(airports);
    console.log(`   Generated ${cars.length} cars`);
    
    // Drop/clear collections
    if (options.dropAll === true) {
      // If --drop-all flag is set, drop all listing-related collections in one shot (but preserve users)
      console.log('\nDropping all listing collections (--drop-all flag set)...');
      const collectionsToDrop = ['flights', 'hotels', 'cars', 'bookings', 'reviews', 'payments', 'airports'];
      const existingCollections = await db.listCollections().toArray();
      const collectionNames = existingCollections.map(c => c.name);
      
      const droppedCollections = [];
      for (const collectionName of collectionsToDrop) {
        if (collectionNames.includes(collectionName)) {
          await db.collection(collectionName).deleteMany({});
          droppedCollections.push(collectionName);
        }
      }
      if (droppedCollections.length > 0) {
        console.log(`   Dropped: ${droppedCollections.join(', ')}`);
      }
      console.log('   Note: Users collection preserved (use seed:test-users to manage users)');
      console.log('\nData dropped. Use without --drop-all to load data.');
      // Skip insertion when --drop-all is used
      return;
    } else if (options.clear !== false) {
      // Default: Clear only flights, hotels, cars
      console.log('\nClearing existing collections...');
      await db.collection('flights').deleteMany({});
      await db.collection('hotels').deleteMany({});
      await db.collection('cars').deleteMany({});
      console.log('   Collections cleared (flights, hotels, cars)');
    } else {
      console.log('\nSkipping data deletion (use --drop or --clear to delete existing data)');
    }
    
    // Insert data
    if (flights.length > 0 || hotels.length > 0 || cars.length > 0) {
      console.log('\nInserting data into MongoDB...');
    }
    
    if (flights.length > 0) {
      // Insert in batches to avoid memory issues (silent batching)
      const batchSize = 1000;
      for (let i = 0; i < flights.length; i += batchSize) {
        const batch = flights.slice(i, i + batchSize);
        await db.collection('flights').insertMany(batch);
      }
      console.log(`   Inserted ${flights.length.toLocaleString()} flights`);
    }
    
    if (hotels.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < hotels.length; i += batchSize) {
        const batch = hotels.slice(i, i + batchSize);
        await db.collection('hotels').insertMany(batch);
      }
      console.log(`   Inserted ${hotels.length.toLocaleString()} hotels`);
    }
    
    if (cars.length > 0) {
      await db.collection('cars').insertMany(cars);
      console.log(`   Inserted ${cars.length.toLocaleString()} cars`);
    }
    
    // Create indexes for better query performance
    console.log('\nCreating indexes...');
    
    // Flights indexes
    await db.collection('flights').createIndex({ from: 1, to: 1, departDate: 1 }, { background: true });
    await db.collection('flights').createIndex({ airline: 1 }, { background: true });
    await db.collection('flights').createIndex({ price: 1 }, { background: true });
    await db.collection('flights').createIndex({ isDeal: 1 }, { background: true });
    await db.collection('flights').createIndex({ class: 1 }, { background: true });
    await db.collection('flights').createIndex({ availableSeats: 1 }, { background: true });
    await db.collection('flights').createIndex({ from: 1, to: 1 }, { background: true });
    
    // Hotels indexes
    await db.collection('hotels').createIndex({ city: 1 }, { background: true });
    await db.collection('hotels').createIndex({ state: 1 }, { background: true });
    await db.collection('hotels').createIndex({ pricePerNight: 1 }, { background: true });
    await db.collection('hotels').createIndex({ rating: 1 }, { background: true });
    await db.collection('hotels').createIndex({ isDeal: 1 }, { background: true });
    
    // Cars indexes
    await db.collection('cars').createIndex({ city: 1 }, { background: true });
    await db.collection('cars').createIndex({ state: 1 }, { background: true });
    await db.collection('cars').createIndex({ pricePerDay: 1 }, { background: true });
    
    // Airports indexes (if collection exists)
    try {
      await db.collection('airports').createIndex({ code: 1 }, { unique: true, background: true });
      await db.collection('airports').createIndex({ city: 1 }, { background: true });
      await db.collection('airports').createIndex({ state: 1 }, { background: true });
    } catch (error) {
      // Index might already exist, continue
      console.log('   Airports indexes may already exist');
    }
    
    console.log('Indexes created');
    
    console.log('\n' + '='.repeat(60));
    console.log('Database seeded successfully with Kaggle data!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`   Flights: ${flights.length.toLocaleString()}`);
    console.log(`   Hotels: ${hotels.length.toLocaleString()}`);
    console.log(`   Cars: ${cars.length.toLocaleString()}`);
    console.log(`   Airports: ${airports.length}`);
    console.log('\nTips:');
    console.log('   - Flight deals are marked with isDeal: true');
    console.log('   - Hotels with limited availability have limitedAvailability: true');
    console.log('   - Data covers dates from Nov 30, 2025 to Feb 28, 2026');
    console.log('   - All prices are in USD');
    console.log('\nOptions:');
    console.log('   --no-drop or --no-clear: Skip deleting existing data (append instead)');
    console.log('   --drop-all or --clear-all: Drop all collections before loading');
    console.log('');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

// Parse command-line arguments
const args = process.argv.slice(2);
const options = {
  clear: !args.includes('--no-clear') && !args.includes('--no-drop'), // Default to true, set to false if --no-clear or --no-drop is passed
  dropAll: args.includes('--drop-all') || args.includes('--clear-all'), // Drop all collections if flag is set
};

// Run the seed script
seedDatabase(options);

