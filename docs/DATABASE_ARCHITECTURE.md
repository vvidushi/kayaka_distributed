# Database Architecture Guide

This document explains when to use Supabase (PostgreSQL), MongoDB Atlas, and Redis in the Kayak platform.

## Overview

The platform uses a multi-database architecture where each database serves specific purposes based on data characteristics and access patterns.

## Supabase (PostgreSQL)

**Use PostgreSQL for:** Relational data requiring ACID transactions, foreign key constraints, and complex joins.

### When to Use PostgreSQL

1. **Structured relational data** with clear relationships
2. **ACID transactions** are required
3. **Data integrity** via foreign keys and constraints
4. **Complex queries** with joins and aggregations
5. **Structured schema** that doesn't change frequently

### Data Stored in PostgreSQL

#### Users Table
- User profiles, authentication (password_hash, role)
- Personal information (address, phone, optional SSN for property partners)
- Partner metadata for listing accounts (profile_type, partner_details JSON)
- User preferences and loyalty tier
- Relationships: One user has many bookings, payments, reviews

#### Bookings Table
- Booking records with status tracking
- References to users (user_id)
- Transactional data requiring consistency
- Relationships: One booking has one payment, many itinerary segments

#### Payments Table
- Payment transactions
- Invoice references
- Transaction history
- Relationships: One payment belongs to one booking and one user

#### Reviews Table
- User reviews for flights, hotels, cars
- Ratings and feedback
- Relationships: One review belongs to one user and one listing

### Example Usage

```javascript
import { getPostgresPool } from '../config/database.js';

const pool = getPostgresPool();

const createBooking = async (userId, bookingData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const bookingResult = await client.query(
      'INSERT INTO bookings (user_id, booking_type, status) VALUES ($1, $2, $3) RETURNING id',
      [userId, bookingData.type, 'PENDING']
    );
    
    const paymentResult = await client.query(
      'INSERT INTO payments (booking_id, user_id, amount) VALUES ($1, $2, $3)',
      [bookingResult.rows[0].id, userId, bookingData.amount]
    );
    
    await client.query('COMMIT');
    return bookingResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

## MongoDB Atlas

**Use MongoDB for:** Document-based data, flexible schemas, high-volume reads, and analytics.

### When to Use MongoDB

1. **Flexible schema** that evolves frequently
2. **Document-based data** (nested objects, arrays)
3. **High read volume** with simple queries
4. **Search and filtering** on various fields
5. **Analytics and telemetry** data
6. **No strict relationships** between documents

### Data Stored in MongoDB

#### Listings Collections

**Flights Collection**
```javascript
{
  _id: "AA123",
  airline: "American Airlines",
  departure: {
    airport: "JFK",
    city: "New York",
    datetime: "2024-01-15T10:00:00Z"
  },
  arrival: {
    airport: "LAX",
    city: "Los Angeles",
    datetime: "2024-01-15T13:30:00Z"
  },
  aircraft: "Boeing 737",
  seats: {
    economy: { available: 120, price: 299 },
    business: { available: 20, price: 899 }
  },
  amenities: ["WiFi", "Entertainment", "Meal"],
  metadata: { ... }
}
```

**Hotels Collection**
```javascript
{
  _id: "hotel_12345",
  name: "Grand Hotel",
  address: {
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    coordinates: { lat: 40.7128, lng: -74.0060 }
  },
  rooms: [
    {
      type: "standard",
      capacity: 2,
      pricePerNight: 150,
      amenities: ["WiFi", "TV", "AC"]
    }
  ],
  amenities: ["Pool", "Gym", "Spa"],
  rating: 4.5,
  reviews: [...]
}
```

**Cars Collection**
```javascript
{
  _id: "car_ABC123",
  provider: "Hertz",
  model: "Toyota Camry",
  year: 2023,
  type: "sedan",
  transmission: "automatic",
  seats: 5,
  pricePerDay: 45,
  availabilityStatus: "available",
  location: {
    pickup: "JFK Airport",
    return: "JFK Airport"
  }
}
```

#### Airports Collection
- Airport reference data for flight location autocomplete
- Stores airport codes (IATA), names, cities, states, coordinates
- Used by `getFlightLocations` service for autocomplete functionality
- Schema:
```javascript
{
  code: "LAX",           // IATA code (unique, indexed)
  name: "Los Angeles International Airport",
  city: "Los Angeles",
  state: "CA",
  country: "US",
  lat: 33.9425,
  lng: -118.4081,
  elevation: 126,
  timezone: "America/Los_Angeles"
}
```

#### Concierge Sessions Collection
- AI conversation sessions
- User context and preferences
- Message history
- Bundle recommendations

#### Watches Collection
- Price/inventory watches for user alerts
- User notification preferences
- Watch criteria and status
- Schema:
```javascript
{
  _id: ObjectId,
  userId: "user_id",
  listingType: "flight" | "hotel" | "car",
  listingId: "listing_id",
  criteria: {
    priceThreshold: 500.00,      // Alert if price drops below
    availabilityThreshold: 5     // Alert if seats/rooms available >=
  },
  status: "active" | "triggered" | "cancelled" | "expired",
  triggeredAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### User Traces Collection (Analytics)
- User behavior events
- Page views and interactions
- Search queries
- Booking funnel steps
- Cohort analysis data

### Example Usage

```javascript
import { getMongoDB } from '../config/database.js';

const searchFlights = async (criteria) => {
  const db = await getMongoDB();
  const flights = db.collection('flights');
  
  const query = {
    'departure.city': criteria.origin,
    'arrival.city': criteria.destination,
    'departure.datetime': {
      $gte: criteria.departureDate,
      $lt: criteria.returnDate
    },
    'seats.economy.available': { $gt: 0 }
  };
  
  return flights.find(query)
    .sort({ 'seats.economy.price': 1 })
    .limit(criteria.limit || 25)
    .toArray();
};
```

## Redis

**Use Redis for:** Caching, session storage, rate limiting, and temporary data.

### When to Use Redis

1. **Caching** frequently accessed data
2. **Session storage** (though we use JWT, Redis can store session metadata)
3. **Rate limiting** per user/endpoint
4. **Temporary data** with TTL
5. **Real-time counters** and statistics
6. **Pub/Sub** for notifications (future)

### Data Stored in Redis

#### Caching

**Listing Cache**
```
Key: listing:flight:AA123
Value: { JSON flight data }
TTL: 300 seconds (5 minutes)
```

**User Cache**
```
Key: user:profile:{userId}
Value: { JSON user profile }
TTL: 600 seconds (10 minutes)
```

**Search Results Cache**
```
Key: search:flights:{hash_of_criteria}
Value: { JSON search results }
TTL: 60 seconds (1 minute)
```

**Flight Locations Cache**
```
Key: flight_locations:{query}:{limit}
Value: { JSON array of airport objects }
TTL: 60 seconds (1 minute)
```

#### Rate Limiting

```
Key: ratelimit:{userId}:{endpoint}
Value: count
TTL: window duration (e.g., 15 minutes)
```

#### Session Metadata (Optional)

```
Key: session:{sessionId}
Value: { lastActivity, ipAddress, userAgent }
TTL: session duration
```

### Example Usage

```javascript
import { getRedisClient } from '../config/database.js';

const getCachedListing = async (type, id) => {
  const redis = await getRedisClient();
  const key = `listing:${type}:${id}`;
  const cached = await redis.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const listing = await fetchListingFromMongoDB(type, id);
  await redis.setEx(key, 300, JSON.stringify(listing));
  return listing;
};

const checkRateLimit = async (userId, endpoint) => {
  const redis = await getRedisClient();
  const key = `ratelimit:${userId}:${endpoint}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 900);
  }
  
  return count <= 100;
};
```

## Decision Matrix

| Data Type | Database | Reason |
|-----------|----------|--------|
| User accounts | PostgreSQL | Relational, ACID transactions, foreign keys |
| Bookings | PostgreSQL | Transactional, relationships with users/payments |
| Payments | PostgreSQL | Financial data, ACID required, audit trail |
| Reviews | PostgreSQL | Relational to users and listings |
| Flight listings | MongoDB | Document-based, flexible schema, high read volume |
| Hotel listings | MongoDB | Document-based, nested room data, search-heavy |
| Car listings | MongoDB | Document-based, simple structure, search-heavy |
| Airport reference data | MongoDB | Static reference data, autocomplete lookups |
| Concierge sessions | MongoDB | Flexible conversation structure, JSON-friendly |
| Price watches | MongoDB | Document-based, flexible criteria |
| User analytics | MongoDB | High volume, flexible schema, time-series friendly |
| Listing cache | Redis | Fast access, frequently queried |
| User cache | Redis | Reduce database load |
| Rate limiting | Redis | Fast counters with TTL |
| Session metadata | Redis | Fast access, temporary data |

## Best Practices

### PostgreSQL
- Use transactions for multi-step operations
- Create indexes on foreign keys and frequently queried fields
- Use connection pooling (already configured)
- Normalize data appropriately
- Use prepared statements to prevent SQL injection

### MongoDB
- Create indexes on frequently queried fields
- Use aggregation pipelines for complex queries
- Store related data together in documents
- Use projections to limit returned fields
- Consider TTL indexes for time-based data

### Redis
- Set appropriate TTLs for cached data
- Use key prefixes for organization (`listing:`, `user:`, etc.)
- Monitor memory usage
- Use pipelining for bulk operations
- Consider Redis Cluster for high availability

## Migration Strategy

When data needs to move between databases:

1. **PostgreSQL → MongoDB**: Export relational data, transform to documents, import
2. **MongoDB → PostgreSQL**: Flatten documents, create relational schema, import
3. **Cache invalidation**: Clear Redis cache when source data changes

## Summary

- **PostgreSQL (Supabase)**: Structured, relational, transactional data (users, bookings, payments)
- **MongoDB Atlas**: Flexible, document-based data (listings, analytics, sessions)
- **Redis**: Fast, temporary data (cache, rate limiting, sessions)

Each database is optimized for its specific use case, providing the best performance and maintainability for the Kayak platform.
