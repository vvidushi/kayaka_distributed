# Quick Start Guide

## Prerequisites

- Python 3.11+
- Docker & Docker Compose
- Node.js 18+ (for API Gateway if using Kong)
- AWS CLI (for AWS deployment)
- Terraform >= 1.8 (for infrastructure)

## Local Development Setup

### 1. Start Infrastructure Services

```bash
cd infra/local
docker compose up -d
```

This starts:
- Kafka (port 9092)
- Kafka Connect (port 8083)
- Kafdrop UI (http://localhost:9000)
- MySQL (port 3306)
- MongoDB (port 27017)
- Redis (port 6379)

### 2. Verify Services

```bash
# Check Kafka
docker exec kafka-broker kafka-topics --bootstrap-server localhost:9092 --list

# Check MySQL
mysql -h localhost -P 3306 -u kayak -pkayak kayak

# Check MongoDB
mongosh mongodb://root:password@localhost:27017

# Check Redis
redis-cli -h localhost -p 6379 ping
```

### 3. Create First Service (User Service Example)

```bash
# Create service directory
mkdir -p services/user-service
cd services/user-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy pymysql pydantic python-jose[cryptography] passlib[bcrypt]

# Create basic structure
mkdir -p app/{api,models,services,db}
touch app/main.py app/api/users.py app/models/user.py app/db/database.py
```

### 4. Basic FastAPI Service Template

**app/main.py:**
```python
from fastapi import FastAPI
from app.api import users

app = FastAPI(title="User Service", version="1.0.0")
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])

@app.get("/health/live")
async def liveness():
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness():
    return {"status": "ready"}
```

**app/api/users.py:**
```python
from fastapi import APIRouter, HTTPException
from app.models.user import User, UserCreate

router = APIRouter()

@router.get("")
async def list_users():
    # TODO: Implement
    return {"items": [], "pagination": {}}

@router.post("", status_code=201)
async def create_user(user: UserCreate):
    # TODO: Implement
    return {"id": "123", **user.dict()}
```

### 5. Run Service

```bash
uvicorn app.main:app --reload --port 8001
```

### 6. Test API

```bash
# Health check
curl http://localhost:8001/health/live

# Create user
curl -X POST http://localhost:8001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "ssn": "123-45-6789",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+1-555-123-4567",
    "address": {
      "line1": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zipCode": "94102"
    }
  }'
```

## Database Setup

### MySQL Schema (Users, Bookings, Payments)

```sql
-- Create database
CREATE DATABASE kayak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Users table
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    ssn VARCHAR(11) UNIQUE NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    address_city VARCHAR(120) NOT NULL,
    address_state CHAR(2) NOT NULL,
    address_zip_code VARCHAR(10) NOT NULL,
    profile_image_url VARCHAR(500),
    loyalty_tier ENUM('none', 'silver', 'gold', 'platinum') DEFAULT 'none',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_state (address_state)
);

-- Bookings table
CREATE TABLE bookings (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    booking_type ENUM('flight', 'hotel', 'car') NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'FAILED') DEFAULT 'PENDING',
    price_amount DECIMAL(10, 2),
    price_currency CHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Payments table
CREATE TABLE payments (
    id CHAR(36) PRIMARY KEY,
    booking_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status ENUM('PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    amount DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    transaction_reference VARCHAR(255),
    invoice_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);
```

### MongoDB Collections (Listings)

```javascript
// Connect to MongoDB
use kayak

// Flights collection
db.flights.insertOne({
  id: "AA1234",
  airline: "American Airlines",
  departureAirport: "SFO",
  arrivalAirport: "JFK",
  departureTime: ISODate("2024-06-01T08:00:00Z"),
  arrivalTime: ISODate("2024-06-01T16:30:00Z"),
  durationMinutes: 510,
  totalSeats: 200,
  availableSeats: 150,
  basePrice: { amount: 450.00, currency: "USD" },
  fareClass: "economy",
  rating: 4.5
})

// Hotels collection
db.hotels.insertOne({
  id: "HOTEL-SF-001",
  name: "Grand Hotel San Francisco",
  address: {
    line1: "123 Market St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102"
  },
  starRating: 4,
  totalRooms: 150,
  pricePerNight: { amount: 200.00, currency: "USD" },
  amenities: ["wifi", "pool", "gym", "spa"]
})

// Create indexes
db.flights.createIndex({ departureAirport: 1, arrivalAirport: 1 })
db.hotels.createIndex({ "address.city": 1, "address.state": 1 })
```

## Kafka Setup

### Create Topics

```bash
# Connect to Kafka container
docker exec -it kafka-broker bash

# Create topics
kafka-topics --create --bootstrap-server localhost:9092 \
  --topic bookings.created --partitions 3 --replication-factor 1

kafka-topics --create --bootstrap-server localhost:9092 \
  --topic bookings.updated --partitions 3 --replication-factor 1

kafka-topics --create --bootstrap-server localhost:9092 \
  --topic payments.created --partitions 3 --replication-factor 1

kafka-topics --create --bootstrap-server localhost:9092 \
  --topic deals.tagged --partitions 3 --replication-factor 1

# List topics
kafka-topics --list --bootstrap-server localhost:9092
```

### Python Kafka Producer Example

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Send booking created event
producer.send('bookings.created', {
    'bookingId': '123',
    'userId': '456',
    'bookingType': 'flight',
    'status': 'PENDING'
})
```

## Next Steps

1. Follow the [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed implementation
2. Start with User Service (Phase 2.1)
3. Implement database migrations
4. Add Kafka integration
5. Build remaining services incrementally

## Useful Commands

```bash
# View API documentation
cd api-docs && docker compose up -d
# Swagger UI: http://localhost:8081
# Redoc: http://localhost:8082

# View Kafka UI
# Kafdrop: http://localhost:9000

# Stop all services
cd infra/local && docker compose down

# Reset databases (WARNING: deletes all data)
cd infra/local && docker compose down -v && docker compose up -d
```

