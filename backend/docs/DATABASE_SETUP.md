# Database Setup Guide

## Cloud Database Services

### 1. Supabase (PostgreSQL)

Supabase provides a free tier PostgreSQL database.

**Setup:**
1. Go to https://supabase.com
2. Create a new project
3. Get your connection details from Settings > Database
4. Use the connection string format:
   ```
   postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
   ```

**Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

### 2. MongoDB Atlas

MongoDB Atlas provides a free M0 cluster.

**Setup:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster (M0)
3. Create a database user
4. Whitelist your IP (0.0.0.0/0 for development)
5. Get connection string from Connect > Connect your application

**Environment Variables:**
```env
MONGODB_URI=mongodb+srv://[USERNAME]:[PASSWORD]@[CLUSTER].mongodb.net/kayak?retryWrites=true&w=majority
```

Note: The database name 'kayak' is hardcoded in the connection string and application code.

### 3. Redis Cloud

Redis Cloud offers a free tier with 30MB RAM.

**Setup:**
1. Go to https://redis.com/try-free/
2. Sign up for free account
3. Create a database
4. Get connection string

**Environment Variables:**
```env
REDIS_URL=redis://default:[PASSWORD]@[HOST]:[PORT]
CACHE_ENABLED=false  # Set to 'true' to enable Redis caching (default: false)
```

**Example:**
```env
REDIS_URL=redis://default:mypassword@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
CACHE_ENABLED=false
```

**Note:** 
- `CACHE_ENABLED=false` disables Redis caching for application data (listings, search results, user profiles)
- Redis is still used for session storage even when `CACHE_ENABLED=false`
- Set `CACHE_ENABLED=true` to enable caching for improved performance

### 4. Local Redis (Development Only)

For local development, you can use Docker Compose:

**Environment Variables:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Local Development

For local development, you can still use Docker Compose:

```bash
cd infra/local
docker compose up -d
```

This will start:
- PostgreSQL (port 5432) - if you want local Postgres instead of Supabase
- MongoDB (port 27017) - if you want local MongoDB instead of Atlas
- Redis (port 6379) - if you want local Redis instead of cloud

## Database Schema

### PostgreSQL (Supabase) Tables

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    ssn VARCHAR(11) UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone_number VARCHAR(15) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    address_city VARCHAR(120) NOT NULL,
    address_state CHAR(2) NOT NULL,
    address_zip_code VARCHAR(10) NOT NULL,
    profile_image_url VARCHAR(500),
    profile_type VARCHAR(20) DEFAULT 'traveler' CHECK (profile_type IN ('traveler', 'property_owner')),
    ssn_verified_at TIMESTAMP,
    partner_details JSONB,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'suspended')),
    loyalty_tier VARCHAR(20) DEFAULT 'none',
    last_login TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN users.id IS 'MongoDB ObjectId stored as TEXT (24-char hex string)';

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    booking_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    price_amount DECIMAL(10, 2),
    price_currency CHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN bookings.user_id IS 'MongoDB ObjectId stored as TEXT (24-char hex string)';

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    user_id TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    amount DECIMAL(10, 2) NOT NULL,
    currency CHAR(3) DEFAULT 'USD',
    transaction_reference VARCHAR(255),
    invoice_url VARCHAR(500),
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN payments.user_id IS 'MongoDB ObjectId stored as TEXT (24-char hex string)';

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    listing_type VARCHAR(20) NOT NULL,
    listing_id VARCHAR(100) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(120),
    body TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN reviews.user_id IS 'MongoDB ObjectId stored as TEXT (24-char hex string)';

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_state ON users(address_state);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key);
CREATE INDEX idx_payments_metadata ON payments USING GIN(metadata);
```

**Note:** The schema above reflects the current state where `users.id`, `bookings.user_id`, `payments.user_id`, and `reviews.user_id` are all TEXT type to store MongoDB ObjectIds (24-character hex strings). If you're migrating from an older schema with UUID types, run the migrations in this order:

1. `backend/prisma/migrations/add_payment_columns.sql` - Adds idempotency_key and metadata columns (run via Supabase SQL Editor)
2. `npm run migrate:users` - Changes users.id from UUID to TEXT (also updates bookings.user_id and reviews.user_id)
3. `npm run migrate:payments` - Changes payments.user_id from UUID to TEXT

### MongoDB Collections

Collections will be created automatically when documents are inserted:

- `flights` - Flight listings
- `hotels` - Hotel listings
- `cars` - Car listings
- `concierge_sessions` - AI concierge sessions
- `watches` - Price/inventory watches
- `user_traces` - User behavior analytics

## Migration Strategy

### Using Prisma (Recommended)

This project uses Prisma for database schema management. See [PRISMA_MIGRATIONS.md](./PRISMA_MIGRATIONS.md) for detailed instructions.

**Quick Start:**
```bash
# Install Prisma dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Deploy all pending migrations
npm run prisma:migrate

# Or create a new migration from schema changes
npm run prisma:migrate:dev -- --name description
```

### Manual SQL Migrations

Alternatively, you can run SQL migrations manually:

1. Use Supabase SQL Editor to run PostgreSQL migrations
2. MongoDB collections are schema-less and created on first insert
3. Run custom migration scripts:
   - `npm run migrate:users` - Changes users.id to TEXT
   - `npm run migrate:payments` - Changes payments.user_id to TEXT
