import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from '../src/config/logger.js';
import { deleteCachedByPattern } from '../src/utils/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const MAJOR_US_AIRPORTS = [
  { code: 'LAX', city: 'Los Angeles', state: 'CA' },
  { code: 'JFK', city: 'New York', state: 'NY' },
  { code: 'SFO', city: 'San Francisco', state: 'CA' },
  { code: 'ORD', city: 'Chicago', state: 'IL' },
  { code: 'DFW', city: 'Dallas', state: 'TX' },
  { code: 'DEN', city: 'Denver', state: 'CO' },
  { code: 'ATL', city: 'Atlanta', state: 'GA' },
  { code: 'LAS', city: 'Las Vegas', state: 'NV' },
  { code: 'SEA', city: 'Seattle', state: 'WA' },
  { code: 'MIA', city: 'Miami', state: 'FL' },
  { code: 'BOS', city: 'Boston', state: 'MA' },
  { code: 'PHX', city: 'Phoenix', state: 'AZ' },
  { code: 'IAH', city: 'Houston', state: 'TX' },
  { code: 'MCO', city: 'Orlando', state: 'FL' },
  { code: 'EWR', city: 'Newark', state: 'NJ' },
  { code: 'CLT', city: 'Charlotte', state: 'NC' },
  { code: 'DTW', city: 'Detroit', state: 'MI' },
  { code: 'PHL', city: 'Philadelphia', state: 'PA' },
  { code: 'LGA', city: 'New York', state: 'NY' },
  { code: 'BWI', city: 'Baltimore', state: 'MD' },
];

// We treat these as our hub airports to keep the route graph dense without exploding combinations
const HUB_AIRPORT_CODES = ['LAX', 'JFK', 'SFO', 'ORD', 'DFW', 'ATL', 'DEN', 'MIA', 'SEA', 'BOS', 'PHX', 'IAH', 'LAS', 'CLT'];

const AIRLINES = [
  { name: 'American Airlines', code: 'AA' },
  { name: 'Delta Air Lines', code: 'DL' },
  { name: 'United Airlines', code: 'UA' },
  { name: 'Southwest Airlines', code: 'WN' },
  { name: 'JetBlue Airways', code: 'B6' },
  { name: 'Alaska Airlines', code: 'AS' },
  { name: 'Spirit Airlines', code: 'NK' },
  { name: 'Frontier Airlines', code: 'F9' },
];

const generateDates = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

const getDateRangeToDec11 = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dec11 = new Date(today.getFullYear(), 11, 11); // months are 0-indexed
  
  // If we're already past Dec 11, seed for next year's window
  if (today > dec11) {
    dec11.setFullYear(dec11.getFullYear() + 1);
  }
  
  return { startDate: today, endDate: dec11 };
};

const generateTime = () => {
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

const generateFlightNumber = (airlineCode) => {
  const flightNum = Math.floor(100 + Math.random() * 9900);
  return `${airlineCode}${flightNum}`;
};

const getRandomFlightClass = () => {
  const rand = Math.random();
  if (rand < 0.6) return 'economy';
  if (rand < 0.8) return 'premium_economy';
  if (rand < 0.95) return 'business';
  return 'first';
};

const getClassPriceMultiplier = (flightClass) => {
  switch (flightClass) {
    case 'economy': return 1.0;
    case 'premium_economy': return 1.5;
    case 'business': return 2.5;
    case 'first': return 4.0;
    default: return 1.0;
  }
};

const getTotalSeats = () => {
  const size = Math.random();
  if (size < 0.3) return 100 + Math.floor(Math.random() * 50);
  if (size < 0.7) return 150 + Math.floor(Math.random() * 50);
  return 200 + Math.floor(Math.random() * 100);
};

const calculateDuration = (from, to) => {
  const baseDuration = 90 + Math.random() * 240;
  return Math.round(baseDuration);
};

const buildRoutesFromAirports = (airports) => {
  const codes = airports
    .map(a => a.code)
    .filter(code => code && typeof code === 'string' && code.trim().length > 0);
  
  const codeSet = new Set(codes);
  const hubs = HUB_AIRPORT_CODES.filter(code => codeSet.has(code));
  if (hubs.length === 0) {
    hubs.push(...codes.slice(0, Math.min(5, codes.length)));
  }
  
  const routeSet = new Set();
  const addRoute = (from, to) => {
    if (!from || !to || from === to) return;
    routeSet.add(`${from}-${to}`);
  };
  
  // Connect every airport to hubs (both directions)
  codes.forEach(code => {
    hubs.forEach(hub => {
      addRoute(code, hub);
      addRoute(hub, code);
    });
  });
  
  // Fully connect hubs to one another
  hubs.forEach((from, idx) => {
    for (let j = idx + 1; j < hubs.length; j++) {
      const to = hubs[j];
      addRoute(from, to);
      addRoute(to, from);
    }
  });
  
  // Give each airport a few peer connections for better coverage without a full cross product
  const peersPerAirport = Math.min(3, codes.length - 1);
  codes.forEach((code, idx) => {
    for (let i = 1; i <= peersPerAirport; i++) {
      const peer = codes[(idx + i) % codes.length];
      addRoute(code, peer);
      addRoute(peer, code);
    }
  });
  
  return Array.from(routeSet).map(route => {
    const [from, to] = route.split('-');
    return { from, to };
  });
};

const generateFlights = (routes, dates, flightIdCounter) => {
  const flights = [];
  
  routes.forEach(({ from, to }) => {
    const basePrice = 150 + Math.random() * 250;
    const baseDuration = calculateDuration(from, to);
    
    dates.forEach(date => {
      const flightsPerDay = 1 + Math.floor(Math.random() * 2); // 1–2 flights/day
      
      for (let i = 0; i < flightsPerDay; i++) {
        const airline = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
        const flightClass = getRandomFlightClass();
        const classMultiplier = getClassPriceMultiplier(flightClass);
        const flightNumber = generateFlightNumber(airline.code);
        const totalSeats = getTotalSeats();
        const availableSeats = Math.floor(totalSeats * (0.35 + Math.random() * 0.55));
        
        const nonstop = Math.random() > 0.2;
        const stops = nonstop ? 0 : 1;
        
        const priceVariation = 0.9 + Math.random() * 0.2;
        const classAdjustedPrice = basePrice * classMultiplier;
        const finalPrice = Math.round(classAdjustedPrice * priceVariation * 100) / 100;
        
        const isDeal = Math.random() < 0.2;
        const dealPrice = isDeal ? Math.round(classAdjustedPrice * 0.8 * 100) / 100 : finalPrice;
        
        flights.push({
          _id: `FL-US-${flightIdCounter.count++}`,
          id: `FL-US-${flightIdCounter.count - 1}`,
          from,
          to,
          departDate: date.toISOString().split('T')[0],
          returnDate: null,
          airline: airline.name,
          flightNumber,
          durationMinutes: baseDuration,
          price: Math.max(99, dealPrice),
          currency: 'USD',
          class: flightClass,
          nonstop,
          stops,
          totalSeats,
          availableSeats,
          departureTime: generateTime(),
          arrivalTime: generateTime(),
          isDeal,
          avgPrice: classAdjustedPrice,
          savingsPercent: isDeal ? Math.round((1 - dealPrice / classAdjustedPrice) * 100) : 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });
  });
  
  return flights;
};

const generateHotels = (cities, hotelIdCounter) => {
  const hotels = [];
  const hotelChains = ['Marriott', 'Hilton', 'Hyatt', 'Holiday Inn', 'Best Western', 
                       'Sheraton', 'Westin', 'Radisson'];
  const hotelSuffixes = ['Grand Hotel', 'Plaza', 'Inn', 'Resort', 'Suites', 'Lodge'];
  const amenities = ['wifi', 'breakfast', 'parking', 'gym', 'pool', 'spa', 
                     'restaurant', 'bar', 'room_service', 'pet_friendly'];
  
  cities.forEach(city => {
    const numHotels = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numHotels; i++) {
      const chain = hotelChains[Math.floor(Math.random() * hotelChains.length)];
      const suffix = hotelSuffixes[Math.floor(Math.random() * hotelSuffixes.length)];
      const name = `${chain} ${city.city} ${suffix}`;
      
      const rating = 3.5 + Math.random() * 1.5;
      const pricePerNight = Math.round((80 + Math.random() * 200) * 100) / 100;
      
      const numAmenities = 3 + Math.floor(Math.random() * 5);
      const selectedAmenities = amenities.sort(() => 0.5 - Math.random()).slice(0, numAmenities);
      
      const lat = 30 + Math.random() * 20;
      const lng = -120 + Math.random() * 40;
      
      hotels.push({
        _id: `HT-US-${hotelIdCounter.count++}`,
        id: `HT-US-${hotelIdCounter.count - 1}`,
        city: city.city,
        state: city.state,
        country: 'United States',
        name,
        rating: Math.round(rating * 10) / 10,
        pricePerNight,
        currency: 'USD',
        amenities: selectedAmenities,
        lat,
        lng,
        isDeal: Math.random() < 0.2,
        limitedAvailability: Math.random() < 0.3,
        availableRooms: Math.floor(10 + Math.random() * 50),
        tags: selectedAmenities.slice(0, 3),
        neighbourhood: city.city,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  });
  
  return hotels;
};

const generateCars = (cities, carIdCounter) => {
  const cars = [];
  const vendors = ['Hertz', 'Avis', 'Enterprise', 'Budget', 'National', 'Alamo', 'Thrifty'];
  const carTypes = [
    { type: 'Economy', seats: 4, basePrice: 35 },
    { type: 'Compact', seats: 4, basePrice: 40 },
    { type: 'Mid-size', seats: 5, basePrice: 50 },
    { type: 'Full-size', seats: 5, basePrice: 60 },
    { type: 'SUV', seats: 7, basePrice: 75 },
    { type: 'Luxury', seats: 5, basePrice: 100 },
  ];
  
  cities.forEach(city => {
    const numCars = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numCars; i++) {
      const vendor = vendors[Math.floor(Math.random() * vendors.length)];
      const carType = carTypes[Math.floor(Math.random() * carTypes.length)];
      
      const pricePerDay = Math.round((carType.basePrice + Math.random() * 20) * 100) / 100;
      
      cars.push({
        _id: `CR-US-${carIdCounter.count++}`,
        id: `CR-US-${carIdCounter.count - 1}`,
        city: city.city,
        state: city.state,
        country: 'United States',
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
  
  return cars;
};

const getMaxId = async (collection, prefix) => {
  try {
    const docs = await collection
      .find({ _id: { $regex: `^${prefix}` } })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();
    
    if (docs.length === 0) return 0;
    
    const lastId = docs[0]._id;
    const match = lastId.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  } catch (error) {
    logger.warn(`Error getting max ID for ${prefix}:`, error);
    return 0;
  }
};

const seedUSData = async () => {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    logger.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    logger.info('Connected to MongoDB');
    
    const db = client.db();
    
    logger.info('Checking existing IDs...');
    const maxFlightId = await getMaxId(db.collection('flights'), 'FL-US-');
    const maxHotelId = await getMaxId(db.collection('hotels'), 'HT-US-');
    const maxCarId = await getMaxId(db.collection('cars'), 'CR-US-');
    
    const flightIdCounter = { count: Math.max(50000, maxFlightId + 1) };
    const hotelIdCounter = { count: Math.max(10000, maxHotelId + 1) };
    const carIdCounter = { count: Math.max(5000, maxCarId + 1) };
    
    logger.info(`Starting IDs: Flights=${flightIdCounter.count}, Hotels=${hotelIdCounter.count}, Cars=${carIdCounter.count}`);
    
    const { startDate, endDate } = getDateRangeToDec11();
    const dates = generateDates(startDate, endDate);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    logger.info(`Generating data for dates between ${startDateStr} and ${endDateStr}`);
    
    // Load all airports in the database so every destination gets coverage
    const airportDocs = await db.collection('airports')
      .find({ code: { $exists: true, $ne: '' } })
      .project({ code: 1, city: 1, state: 1 })
      .toArray();
    
    const airports = airportDocs.length > 0
      ? airportDocs.map(a => ({ code: a.code, city: a.city || 'Unknown', state: a.state || 'Unknown' }))
      : MAJOR_US_AIRPORTS;
    
    const routes = buildRoutesFromAirports(airports);
    logger.info(`Prepared ${routes.length} routes across ${airports.length} airports`);
    
    logger.info('Generating US flight data...');
    const flights = generateFlights(routes, dates, flightIdCounter);
    logger.info(`Generated ${flights.length} flights`);
    
    logger.info('Generating US hotel data...');
    const hotels = generateHotels(MAJOR_US_AIRPORTS, hotelIdCounter);
    logger.info(`Generated ${hotels.length} hotels`);
    
    logger.info('Generating US car data...');
    const cars = generateCars(MAJOR_US_AIRPORTS, carIdCounter);
    logger.info(`Generated ${cars.length} cars`);

    // Refresh the date window we just generated so the calendar uses seeded rates
    if (dates.length > 0) {
      logger.info(`Clearing existing flights in range ${startDateStr} to ${endDateStr}...`);
      await db.collection('flights').deleteMany({
        departDate: { $gte: startDateStr, $lte: endDateStr },
      });

      // Invalidate cached flight search results so the UI sees the new data immediately
      try {
        await deleteCachedByPattern('search:flight:*');
        logger.info('Cleared cached flight search results');
      } catch (cacheError) {
        logger.warn('Failed to clear cached flight search results:', cacheError);
      }
    }
    
    const bulkUpsert = async (collectionName, docs, label) => {
      if (!docs.length) return;
      const collection = db.collection(collectionName);
      const chunkSize = 5000;
      let inserted = 0;
      let matched = 0;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const slice = docs.slice(i, i + chunkSize);
        const ops = slice.map(doc => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: doc },
            upsert: true,
          },
        }));
        const res = await collection.bulkWrite(ops, { ordered: false });
        inserted += res.upsertedCount || 0;
        matched += (res.matchedCount || 0);
      }
      logger.info(`Upserted ${label}: inserted ${inserted}, matched ${matched}`);
    };
    
    logger.info('Upserting flights into database...');
    await bulkUpsert('flights', flights, 'flights');
    
    logger.info('Upserting hotels into database...');
    await bulkUpsert('hotels', hotels, 'hotels');
    
    logger.info('Upserting cars into database...');
    await bulkUpsert('cars', cars, 'cars');
    
    logger.info('US data seeding completed successfully');
    
  } catch (error) {
    logger.error('Error seeding US data:', error);
    throw error;
  } finally {
    await client.close();
  }
};

seedUSData()
  .then(() => {
    logger.info('Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Seed script failed:', error);
    process.exit(1);
  });
