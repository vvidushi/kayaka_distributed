# Sample Travel Data

Complete sample data for flights, hotels, and rental cars available in the database for testing searches and filter conditions.

**Database:** MongoDB Atlas (kayak)  
**Collections:** flights (512,750 docs), hotels (1,245 docs), cars (865 docs)  
**Date Range:** November 30, 2025 to February 28, 2026  
**Last Updated:** December 7, 2025

---

## Flights

### One-Way Flight Routes

Major US and international routes with nonstop and connecting flights.

| From | To | Sample Date | Price Range | Airlines | Duration | Stops |
|------|-----|-------------|-------------|----------|----------|-------|
| **LAX** | **JFK** | 2025-12-15 | $286-$1,229 | American, Delta, United, Southwest, JetBlue | 5h 30m-8h 45m | 0-2 |
| **SFO** | **ORD** | 2025-12-20 | $198-$945 | American, United, Southwest | 4h 15m-7h 30m | 0-1 |
| **ATL** | **DEN** | 2025-12-18 | $156-$823 | Delta, Southwest, Frontier | 3h 45m-6h 20m | 0-1 |
| **BOS** | **LAX** | 2025-12-22 | $312-$1,456 | Alaska, Delta, Southwest, American | 6h 10m-9h 45m | 0-2 |
| **MIA** | **SEA** | 2025-12-25 | $345-$1,189 | American, Delta, Alaska | 6h 45m-10h 15m | 0-2 |
| **PHX** | **SEA** | 2025-12-16 | $198-$867 | Alaska, Southwest, American | 3h 15m-5h 45m | 0-1 |
| **LAX** | **ATL** | 2025-12-20 | $172-$378 | Delta, Southwest, Spirit | 4h 30m-7h 15m | 0-1 |
| **JFK** | **MIA** | 2025-12-28 | $223-$892 | JetBlue, Delta, American | 3h 25m-6h 10m | 0-1 |
| **ORD** | **LAX** | 2025-12-14 | $245-$1,034 | United, American, Southwest | 4h 45m-7h 30m | 0-1 |
| **DEN** | **BOS** | 2025-12-30 | $267-$945 | United, Southwest, JetBlue | 4h 20m-7h 45m | 0-1 |
| **BTI** | **BTT** | 2025-11-30 | $3,456-$8,934 | SpiceJet, Air India, Vistara | 2h 10m-4h 35m | 0-2 |
| **BED** | **PTU** | 2025-12-04 | $2,789-$7,123 | Vistara, GO_FIRST, SpiceJet | 3h 45m-6h 20m | 0-1 |

### Round-Trip Flight Routes

Routes with outbound and return flights (prices shown are total round-trip).

| From | To | Sample Dates | Total Price | Airlines | Notes |
|------|-----|--------------|-------------|----------|-------|
| **LAX** ⇄ **JFK** | Dec 15-22 | $572-$2,458 | American, Delta, United | 7-day trip, holiday season |
| **SFO** ⇄ **ORD** | Dec 20-27 | $396-$1,890 | American, United, Southwest | Weekend rates apply |
| **ATL** ⇄ **DEN** | Dec 18-21 | $312-$1,646 | Delta, Southwest | Short weekend trip |
| **BOS** ⇄ **MIA** | Dec 22-29 | $446-$2,184 | JetBlue, Delta, American | Holiday travel |
| **SEA** ⇄ **DFW** | Dec 16-20 | $398-$1,734 | American, Delta, Alaska | Business travel |
| **MIA** ⇄ **LAX** | Dec 25-Jan 2 | $690-$2,912 | American, Delta, United | Holiday premium |

### Filter Conditions for Flights

**Supported Filters:**
- **Price Range:** $100-$10,000 (filter by min/max price)
- **Airlines:** American, Delta, United, Southwest, JetBlue, Alaska, Frontier, Spirit, SpiceJet, Air India, Vistara, GO_FIRST
- **Stops:** Nonstop (0), 1 stop, 2+ stops
- **Class:** Economy, Premium Economy, Business, First
- **Departure Times:** Morning (6am-12pm), Afternoon (12pm-6pm), Evening (6pm-12am), Night (12am-6am)
- **Duration:** Under 3h, 3-6h, 6-9h, 9h+
- **Trip Type:** one-way, round-trip

**Sample Search Queries:**
```
"Find nonstop flights from LAX to JFK under $500"
"Show me round-trip flights from SFO to ORD departing Dec 20"
"Cheapest flights from BOS to MIA in economy class"
"Direct flights from PHX to SEA on December 16"
```

**Fetch Real Data (MongoDB):**
```bash
# Get all one-way flights LAX to JFK
mongosh "mongodb+srv://..." --eval 'db.flights.find({from: "LAX", to: "JFK", departDate: "2025-12-15"}).limit(5)'

# Get nonstop flights with price filter
mongosh "mongodb+srv://..." --eval 'db.flights.find({from: "SFO", to: "ORD", nonstop: true, price: {$lte: 500}}).limit(10)'

# Get round-trip flights
mongosh "mongodb+srv://..." --eval 'db.flights.find({from: "LAX", to: "JFK", returnDate: {$ne: null}}).limit(5)'

# Aggregate flights by route
mongosh "mongodb+srv://..." --eval 'db.flights.aggregate([
  {$match: {from: "BOS", to: "MIA"}},
  {$group: {_id: "$airline", avgPrice: {$avg: "$price"}, count: {$sum: 1}}},
  {$sort: {avgPrice: 1}}
])'
```

---

## Hotels

### Hotels by City

| City | Hotels | Price Range | Avg Rating | Popular Amenities |
|------|--------|-------------|------------|-------------------|
| **New York** | 60 | $81-$255/night | 3.8-4.5 | WiFi, Restaurant, Bar, Room Service |
| **Williamsburg** | 84 | $65-$198/night | 3.5-4.2 | Room Service, Parking, Breakfast, WiFi |
| **Harlem** | 82 | $72-$189/night | 3.6-4.3 | Spa, Restaurant, Kitchen, Pool |
| **Boston** | 34 | $95-$245/night | 3.9-4.6 | Parking, Breakfast, Gym, WiFi |
| **Miami** | 42 | $110-$289/night | 4.0-4.7 | Pool, Beach Access, Bar, WiFi |
| **Philadelphia** | 35 | $78-$210/night | 3.7-4.4 | Parking, Breakfast, Gym, WiFi |
| **Detroit** | 35 | $65-$175/night | 3.5-4.1 | Pet Friendly, Spa, Gym, Parking |
| **Denver** | 35 | $88-$225/night | 3.8-4.5 | Pool, Bar, Pet Friendly, WiFi |
| **Charlotte** | 34 | $75-$195/night | 3.6-4.3 | Restaurant, Pet Friendly, Parking, Breakfast |

### Sample Hotel Properties

| Name | City | Price/Night | Rating | Amenities | Property Type |
|------|------|-------------|--------|-----------|---------------|
| Skylit Midtown Castle | New York (Midtown) | $225 | 3.7 | Spa, Bar, Pool, Room Service, Kitchen, WiFi | Hotel |
| Harbor View Inn | Boston | $185 | 4.2 | Parking, Breakfast, WiFi, Gym | Hotel |
| Ocean Breeze Resort | Miami | $245 | 4.5 | Pool, Beach Access, Bar, Restaurant, Spa | Resort |
| Liberty Bell Suites | Philadelphia | $165 | 4.0 | Parking, Breakfast, Gym, WiFi, Pet Friendly | Hotel |
| Mile High Hotel | Denver | $175 | 4.1 | Pool, Bar, Pet Friendly, WiFi, Parking | Hotel |

### Filter Conditions for Hotels

**Supported Filters:**
- **Price Range:** $50-$500/night (filter by pricePerNight)
- **Rating:** 3.0+, 3.5+, 4.0+, 4.5+ stars
- **Amenities:** WiFi, Pool, Spa, Gym, Parking, Breakfast, Bar, Restaurant, Room Service, Kitchen, Pet Friendly, Beach Access
- **Property Type:** Hotel, Resort, Motel, Inn, B&B
- **Neighborhood:** Midtown, Williamsburg, Harlem, East Village, Downtown
- **Availability:** Available rooms (filter by availableRooms > 0)

**Sample Search Queries:**
```
"Find hotels in New York with a pool under $200/night"
"Show me 4-star hotels in Boston with parking"
"Pet-friendly hotels in Philadelphia from Dec 15-17"
"Miami hotels with beach access and spa"
"Budget hotels in Denver with free breakfast"
```

**Fetch Real Data (MongoDB):**
```bash
# Get hotels in New York with amenities
mongosh "mongodb+srv://..." --eval 'db.hotels.find({city: "New York", pricePerNight: {$lte: 200}, amenities: "pool"}).limit(10)'

# Get 4-star+ hotels in Boston
mongosh "mongodb+srv://..." --eval 'db.hotels.find({city: "Boston", rating: {$gte: 4.0}}).sort({rating: -1}).limit(10)'

# Get pet-friendly hotels
mongosh "mongodb+srv://..." --eval 'db.hotels.find({city: "Philadelphia", amenities: "pet_friendly"}).limit(10)'

# Aggregate hotels by city with stats
mongosh "mongodb+srv://..." --eval 'db.hotels.aggregate([
  {$group: {
    _id: "$city",
    count: {$sum: 1},
    avgPrice: {$avg: "$pricePerNight"},
    avgRating: {$avg: "$rating"}
  }},
  {$sort: {count: -1}},
  {$limit: 10}
])'
```

---

## Rental Cars

### Cars by City

| City | Cars Available | Price Range | Vehicle Types | Rental Companies |
|------|----------------|-------------|---------------|------------------|
| **New York** | 65 | $45-$189/day | Economy, Compact, Midsize, SUV, Luxury | Avis, Budget, Enterprise, Hertz |
| **Miami** | 36 | $52-$215/day | Economy, Convertible, SUV, Luxury | Avis, Budget, Hertz, National |
| **San Francisco** | 36 | $58-$225/day | Economy, Hybrid, SUV, Luxury | Avis, Enterprise, Hertz |
| **Chicago** | 35 | $48-$198/day | Economy, Midsize, SUV | Budget, Enterprise, Hertz |
| **Los Angeles** | 31 | $55-$235/day | Economy, Convertible, SUV, Luxury | Avis, Budget, Hertz, National |
| **Atlanta** | 36 | $46-$185/day | Economy, Midsize, SUV | Avis, Budget, Enterprise |
| **Orlando** | 34 | $50-$195/day | Economy, Minivan, SUV | Budget, Enterprise, Hertz |
| **Phoenix** | 31 | $47-$178/day | Economy, Midsize, SUV | Avis, Budget, Enterprise |
| **Dallas** | 33 | $49-$192/day | Economy, Midsize, SUV, Truck | Budget, Enterprise, Hertz |
| **Detroit** | 33 | $44-$175/day | Economy, Midsize, SUV | Avis, Budget, Enterprise |
| **Las Vegas** | 31 | $58-$245/day | Economy, Convertible, Luxury, SUV | Avis, Budget, Hertz, National |
| **Baltimore** | 31 | $43-$168/day | Economy, Midsize, SUV | Budget, Enterprise, Hertz |

### Sample Rental Vehicles

| Type | Company | City | Price/Day | Seats | Transmission | Features |
|------|---------|------|-----------|-------|--------------|----------|
| Economy | Avis | New York | $55 | 5 | Automatic | Fuel Efficient, Bluetooth |
| SUV | Enterprise | Miami | $125 | 7 | Automatic | GPS, 4WD, Spacious |
| Luxury | Hertz | Los Angeles | $215 | 5 | Automatic | Premium Sound, Leather |
| Compact | Budget | Chicago | $48 | 5 | Automatic | Fuel Efficient, Easy Parking |
| Midsize | Avis | San Francisco | $75 | 5 | Automatic | Hybrid, GPS |
| SUV | Budget | Phoenix | $95 | 7 | Automatic | GPS, AC, Spacious |
| Convertible | National | Miami | $175 | 4 | Automatic | Premium, Bluetooth |
| Minivan | Enterprise | Orlando | $110 | 8 | Automatic | Family Friendly, GPS |

### Filter Conditions for Rental Cars

**Supported Filters:**
- **Price Range:** $40-$300/day (filter by pricePerDay)
- **Vehicle Type:** Economy, Compact, Midsize, SUV, Luxury, Convertible, Minivan, Truck
- **Rental Company:** Avis, Budget, Enterprise, Hertz, National, Dollar, Thrifty
- **Seats:** 2-4, 5, 6-7, 8+
- **Transmission:** Automatic, Manual
- **Features:** GPS, Bluetooth, 4WD, Hybrid, Premium Sound, Leather Seats

**Sample Search Queries:**
```
"Find rental cars in New York under $100/day"
"Show me SUVs in Miami for a week"
"Economy cars in Chicago with automatic transmission"
"Luxury rental in Los Angeles with GPS"
"7-seater SUV in Phoenix for family trip"
```

**Fetch Real Data (MongoDB):**
```bash
# Get economy cars under $100/day
mongosh "mongodb+srv://..." --eval 'db.cars.find({city: "New York", pricePerDay: {$lte: 100}, type: "Economy"}).limit(10)'

# Get SUVs in Miami
mongosh "mongodb+srv://..." --eval 'db.cars.find({city: "Miami", type: "SUV"}).sort({pricePerDay: 1}).limit(10)'

# Get 7+ seater vehicles
mongosh "mongodb+srv://..." --eval 'db.cars.find({city: "Phoenix", seats: {$gte: 7}}).limit(10)'

# Aggregate cars by city and type
mongosh "mongodb+srv://..." --eval 'db.cars.aggregate([
  {$group: {
    _id: {city: "$city", type: "$type"},
    count: {$sum: 1},
    avgPrice: {$avg: "$pricePerDay"}
  }},
  {$sort: {avgPrice: 1}},
  {$limit: 20}
])'
```

---

## API Endpoints

### Flights
```
GET /api/v1/flights/search?from=LAX&to=JFK&departDate=2025-12-15
GET /api/v1/flights/search?from=SFO&to=ORD&departDate=2025-12-20&returnDate=2025-12-27
GET /api/v1/flights/airlines?from=BOS&to=MIA&departDate=2025-12-22
```

### Hotels
```
GET /api/v1/hotels/search?city=New York&checkIn=2025-12-15&checkOut=2025-12-17
GET /api/v1/hotels/search?city=Miami&minPrice=100&maxPrice=250&amenities=pool,spa
GET /api/v1/hotels/search?city=Boston&rating=4.0
```

### Rental Cars
```
GET /api/v1/cars/search?city=New York&pickupDate=2025-12-15&dropoffDate=2025-12-20
GET /api/v1/cars/search?city=Miami&type=SUV&maxPrice=150
GET /api/v1/cars/search?city=Los Angeles&company=Hertz&seats=7
```

---

## AI Agent Quick Suggestions

**Flights:** Working (Tested & Verified)
- "Find flights from SFO to JFK on December 15" - Returns 4 flights ($286-$1,229)
- "Show me flights from LAX to ATL on December 20" - Returns 6 flights ($147-$422)  
- "Find flights from BOS to LAX on December 22" - Returns 1 flight ($159)
- "Direct flights from PHX to SEA on December 16" - Returns 3 direct flights ($265-$545)

**Hotels:** Working (Tested & Verified)
- "Find hotels in New York from Dec 15-17" - Returns 20 hotels ($81-$148/night)
- "Show me hotels in Miami from Dec 20-25" - Returns 20 hotels ($83-$255/night)
- "Budget-friendly hotels in Boston from Dec 15-17" - Returns 20 hotels ($82-$196/night)
- "Pet-friendly hotels in Philadelphia from Dec 20-22" - Returns 20 hotels ($83-$203/night)

**Cars:** Working (Tested & Verified)
- "Rent an SUV in New York from Dec 15-20" - Returns 20 cars ($36-$56/day)
- "Economy car in Boston from Dec 22-25" - Returns 20 cars ($36-$73/day)
- "Luxury car rental in Miami from Dec 20-27" - Returns 20 cars ($37-$67/day)
- "Compact car in Philadelphia from Dec 15-18" - Returns 20 cars ($35-$74/day)

**Test with AI Agent (Curl):**
```bash
# Create session
SESSION_ID=$(curl -s -X POST http://localhost:8000/api/v1/concierge/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user", "flow_type": "flights"}' | jq -r '.session_id')

# Send message and get results
curl -X POST "http://localhost:8000/api/v1/concierge/sessions/$SESSION_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{"message": "Find flights from LAX to JFK on December 15"}' | jq .

# Example response includes:
# - response: Natural language summary
# - bundles: Array of flight options with pricing
# - context: Updated search context
```

---

## Notes

- All prices in USD
- Dates range from November 30, 2025 to February 28, 2026
- Flight data includes both US domestic and international routes
- Hotel data primarily covers major US cities
- Car rental data available in 20+ major US cities
- All collections support MongoDB text search and complex filtering

## Quick Data Validation

**Check Flight Data Availability:**
```bash
# Count flights by route
mongosh "mongodb+srv://..." --eval 'db.flights.countDocuments({from: "LAX", to: "JFK"})'

# Get date range
mongosh "mongodb+srv://..." --eval 'db.flights.aggregate([
  {$group: {_id: null, minDate: {$min: "$departDate"}, maxDate: {$max: "$departDate"}}}
])'
```

**Check Hotel Data Availability:**
```bash
# Count hotels by city
mongosh "mongodb+srv://..." --eval 'db.hotels.aggregate([
  {$group: {_id: "$city", count: {$sum: 1}}},
  {$sort: {count: -1}}
])'

# Get price statistics
mongosh "mongodb+srv://..." --eval 'db.hotels.aggregate([
  {$group: {
    _id: "$city",
    avgPrice: {$avg: "$pricePerNight"},
    minPrice: {$min: "$pricePerNight"},
    maxPrice: {$max: "$pricePerNight"}
  }}
])'
```

**Check Car Rental Data Availability:**
```bash
# Count cars by city
mongosh "mongodb+srv://..." --eval 'db.cars.countDocuments({city: "New York"})'

# Get vehicle types available
mongosh "mongodb+srv://..." --eval 'db.cars.distinct("type")'

# Get vendors available
mongosh "mongodb+srv://..." --eval 'db.cars.distinct("vendor")'
```

## Testing Endpoints

**Test Backend Listings API:**
```bash
# Test flight search
curl "http://localhost:3000/api/v1/listings/flights/search?from=LAX&to=JFK&departDate=2025-12-15" | jq '.flights | length'

# Test hotel search
curl "http://localhost:3000/api/v1/listings/hotels/search?city=New%20York" | jq '.hotels | length'

# Test car search
curl "http://localhost:3000/api/v1/listings/cars/search?city=Miami" | jq '.cars | length'
```

**Test AI Agent Endpoints:**
```bash
# Health check
curl http://localhost:8000/health

# Create session and search
SESSION=$(curl -s -X POST http://localhost:8000/api/v1/concierge/sessions \
  -H "Content-Type: application/json" \
  -d '{"flow_type": "flights"}' | jq -r '.session_id')

curl -X POST "http://localhost:8000/api/v1/concierge/sessions/$SESSION/messages" \
  -H "Content-Type: application/json" \
  -d '{"message": "Find flights from SFO to JFK on December 15"}' | jq .
```
