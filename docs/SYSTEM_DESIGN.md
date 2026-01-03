# Kayak Clone - System Design Document

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Service Architecture](#service-architecture)
5. [Database Architecture](#database-architecture)
6. [Communication Patterns](#communication-patterns)
7. [Data Flow](#data-flow)
8. [Infrastructure & Deployment](#infrastructure--deployment)
9. [Security Architecture](#security-architecture)
10. [Scalability & Performance](#scalability--performance)

---

## Architecture Overview

### High-Level Architecture

The Kayak clone is a **distributed microservices-based travel booking platform** built with a **cloud-first approach**. The system follows a **layered architecture** with clear separation between presentation, business logic, and data layers.

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  React Frontend (Port 5173)                          │    │
│  │  - User Interface                                     │    │
│  │  - State Management (Redux + React Query)            │    │
│  │  - Routing (React Router)                            │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                  API GATEWAY LAYER                            │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Express.js Backend (Port 3000)                      │    │
│  │  - Request Routing                                   │    │
│  │  - Authentication & Authorization                    │    │
│  │  - Rate Limiting                                     │    │
│  │  - Request Validation                                │    │
│  │  - Error Handling                                    │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────┬───────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼──────┐
│  PostgreSQL  │   │    MongoDB      │   │   Redis    │
│  (Supabase)  │   │    (Atlas)      │   │   Cloud    │
│              │   │                 │   │            │
│  Relational  │   │  Document Store │   │   Cache    │
│  Data        │   │  & Analytics    │   │   & Rate   │
│              │   │                 │   │   Limiting │
└──────────────┘   └─────────────────┘   └───────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Kafka (Aiven) │
                    │  Event Bus     │
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼──────┐
│  Firebase    │   │   AI Agent     │   │  External  │
│  Storage     │   │   (FastAPI)    │   │  Services  │
│              │   │                │   │            │
│  Images      │   │  Concierge     │   │  Payment   │
│              │   │  & Bundles     │   │  Gateway   │
└──────────────┘   └────────────────┘   └────────────┘
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.18
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator, Joi
- **Logging**: Winston with daily rotation
- **Monitoring**: Prometheus metrics
- **ORM**: Prisma (for PostgreSQL)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **State Management**: 
  - Redux Toolkit (client state)
  - React Query/TanStack Query (server state)
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS + DaisyUI
- **HTTP Client**: Axios
- **Maps**: Leaflet

### Databases
- **PostgreSQL (Supabase)**: Relational data (users, bookings, payments, reviews)
- **MongoDB Atlas**: Document store (listings, analytics, sessions)
- **Redis Cloud**: Caching and session storage

### Message Queue
- **Apache Kafka (Aiven Cloud)**: Event streaming and async communication

### Storage
- **Firebase Storage**: Image hosting and file storage

### AI/ML
- **AI Agent Service**: Python 3.12 + FastAPI
- **LLM Integration**: OpenAI API (for concierge service)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Orchestration**: Kubernetes (infra2/)
- **Cloud Services**: All services use cloud providers (no local dependencies)

---

## System Architecture

### 1. Presentation Layer (Frontend)

**React Application** (`frontend/`)
- **Single Page Application (SPA)** with client-side routing
- **Component-based architecture** with reusable components
- **State management** split between:
  - Redux Toolkit: Authentication, UI state
  - React Query: Server state, caching, synchronization

**Key Features:**
- Protected routes with authentication
- Optimistic UI updates
- Error boundaries for fault tolerance
- Responsive design with Tailwind CSS

### 2. API Gateway Layer (Backend)

**Express.js Server** (`backend/src/server.js`)
- **Monolithic API Gateway** that routes to different service modules
- **Middleware Stack:**
  - Helmet: Security headers
  - CORS: Cross-origin resource sharing
  - Compression: Response compression
  - Rate Limiting: 500 req/15min (dev), 100 req/15min (prod)
  - Morgan: HTTP request logging
  - Winston: Application logging
  - Session Management: Redis-based sessions

**API Structure:**
```
/api/v1/
├── auth          # Authentication endpoints
├── users         # User management
├── flights       # Flight listings
├── hotels        # Hotel listings
├── cars          # Car listings
├── bookings      # Booking management
├── payments      # Payment processing
├── admin         # Admin operations
├── concierge     # AI concierge
├── analytics     # Analytics and tracking
├── images        # Image uploads
└── owner         # Property owner endpoints
```

### 3. Service Layer (Backend Services)

The backend is organized as **logical services** within a monolithic Express.js application:

#### 3.1 User & Auth Service
- **Purpose**: User management and authentication
- **Database**: PostgreSQL (users table)
- **Features**:
  - User registration and login
  - JWT token generation and validation
  - Role-based access control (user, admin, owner, moderator)
  - Profile management
  - SSN validation for property owners

#### 3.2 Listings Service
- **Purpose**: Search and manage travel listings
- **Database**: MongoDB Atlas (flights, hotels, cars collections)
- **Cache**: Redis (listing data, search results)
- **Features**:
  - Search flights, hotels, and cars
  - Filtering and pagination
  - Availability checking
  - Price comparison

#### 3.3 Bookings Service
- **Purpose**: Booking creation and management
- **Database**: PostgreSQL (bookings table)
- **Features**:
  - Create bookings with transactional guarantees
  - Status management (PENDING, CONFIRMED, COMPLETED, CANCELLED, FAILED)
  - Conflict detection (double booking prevention)
  - Integration with listings service
  - Kafka event publishing

#### 3.4 Billing & Payments Service
- **Purpose**: Payment processing and transaction management
- **Database**: PostgreSQL (payments table)
- **Features**:
  - Payment creation with idempotency keys
  - Payment processing (mock Stripe-like gateway)
  - Refund processing
  - Transaction status tracking
  - Invoice generation (structure ready)
  - Kafka event publishing

#### 3.5 Admin Service
- **Purpose**: Administrative operations
- **Databases**: PostgreSQL + MongoDB
- **Features**:
  - Inventory management (add/edit/delete listings)
  - User management
  - Revenue reports
  - Analytics dashboards

#### 3.6 Concierge Service
- **Purpose**: AI-powered travel recommendations
- **Database**: MongoDB Atlas (concierge sessions)
- **External**: AI Agent Service (FastAPI)
- **Features**:
  - Chat-based concierge interface
  - Bundle recommendations
  - Price watches
  - Intent parsing

#### 3.7 Analytics Service
- **Purpose**: User behavior tracking and insights
- **Database**: MongoDB Atlas (user traces, click logs)
- **Features**:
  - Click tracking
  - User journey tracking
  - Cohort analysis
  - Revenue analytics

---

## Database Architecture

### Multi-Database Strategy

The system uses **three different databases**, each optimized for specific use cases:

#### PostgreSQL (Supabase) - Relational Data

**Use Cases:**
- Structured data with relationships
- ACID transactions required
- Data integrity via foreign keys
- Complex joins and aggregations

**Tables:**
1. **users**
   - User profiles, authentication
   - Personal information (address, phone, SSN)
   - Role-based access control
   - Relationships: one-to-many with bookings, payments, reviews

2. **bookings**
   - Booking records with status tracking
   - References to users (foreign key)
   - Transactional data requiring consistency
   - Relationships: one-to-one with payments

3. **payments**
   - Payment transactions
   - Transaction references and status
   - Idempotency keys
   - Relationships: belongs to one booking and one user

4. **reviews**
   - User reviews for listings
   - Ratings and feedback
   - Relationships: belongs to one user and one listing

#### MongoDB Atlas - Document Store

**Use Cases:**
- Flexible schema that evolves
- Document-based data (nested objects, arrays)
- High read volume with simple queries
- Analytics and telemetry data

**Collections:**
1. **flights** - Flight listings with flexible schema
2. **hotels** - Hotel listings with nested room data
3. **cars** - Car rental listings
4. **concierge_sessions** - AI conversation sessions
5. **watches** - Price/inventory watches
6. **user_traces** - User behavior analytics
7. **click_logs** - Click tracking data

#### Redis Cloud - Cache & Sessions

**Use Cases:**
- Caching frequently accessed data
- Session storage
- Rate limiting
- Temporary data with TTL

**Key Patterns:**
- `listing:{type}:{id}` - Cached listing data (TTL: 300s)
- `user:{userId}` - Cached user profiles (TTL: 600s)
- `search:{type}:{hash}` - Cached search results (TTL: 60s)
- `ratelimit:{userId}:{endpoint}` - Rate limiting counters
- `session:{sessionId}` - Session metadata

---

## Communication Patterns

### 1. Synchronous Communication (HTTP/REST)

**Request-Response Pattern:**
```
Frontend → Backend API → Database → Response
```

**Characteristics:**
- Synchronous, blocking
- Immediate response required
- Used for: user actions, searches, CRUD operations

### 2. Asynchronous Communication (Kafka)

**Event-Driven Pattern:**
```
Service → Kafka Topic → Consumer → Action
```

**Kafka Topics:**
- `bookings.created` - New booking created
- `bookings.updated` - Booking status changed
- `bookings.confirmed` - Booking confirmed
- `payments.created` - Payment initiated
- `payments.succeeded` - Payment completed
- `payments.refunded` - Payment refunded
- `inventory.updated` - Listing inventory changed
- `watches.triggered` - Price watch triggered
- `deals.tagged` - Deal events

**Event Flow Example:**
```
1. User creates booking
2. Bookings Service → Publishes "bookings.created" event
3. Kafka Consumer → Updates inventory
4. Kafka Consumer → Sends notification
5. Kafka Consumer → Updates analytics
```

### 3. External Service Communication

**AI Agent Service:**
- **Protocol**: HTTP/REST
- **Purpose**: AI concierge functionality
- **Communication**: Backend → AI Agent (FastAPI)
- **Pattern**: Request-Response with async processing

**Firebase Storage:**
- **Protocol**: HTTP/REST (Firebase SDK)
- **Purpose**: Image uploads and storage
- **Communication**: Backend/Frontend → Firebase Storage

---

## Data Flow

### Booking Flow Example

```
1. User searches for flights (Frontend)
   ↓
2. GET /api/v1/flights?from=JFK&to=LAX (Backend)
   ↓
3. Check Redis cache → If miss, query MongoDB
   ↓
4. Return search results → Cache in Redis
   ↓
5. User selects flight and creates booking
   ↓
6. POST /api/v1/bookings (Backend)
   ↓
7. Begin PostgreSQL transaction
   ├─ Insert booking record
   ├─ Check availability in MongoDB
   └─ Commit transaction
   ↓
8. Publish "bookings.created" event to Kafka
   ↓
9. Return booking confirmation
   ↓
10. User initiates payment
    ↓
11. POST /api/v1/payments (Backend)
    ↓
12. Begin PostgreSQL transaction
    ├─ Create payment record
    ├─ Process payment (mock gateway)
    └─ Update payment status
    ↓
13. Publish "payments.succeeded" event to Kafka
    ↓
14. Kafka consumers:
    ├─ Update booking status
    ├─ Update inventory
    └─ Send confirmation email (future)
```

### Search Flow with Caching

```
1. User searches listings
   ↓
2. Generate cache key: search:flights:{hash_of_criteria}
   ↓
3. Check Redis cache
   ├─ Cache HIT → Return cached results
   └─ Cache MISS → Continue
   ↓
4. Query MongoDB with filters
   ↓
5. Return results and cache in Redis (TTL: 60s)
```

---

## Infrastructure & Deployment

### Containerization

**Docker Architecture:**
```
┌─────────────────────────────────────┐
│  Docker Compose                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Backend  │  │ Frontend │        │
│  │ :3000    │  │ :5173    │        │
│  └────┬─────┘  └────┬─────┘        │
│       │             │               │
│  ┌────▼─────────────▼─────┐        │
│  │   AI Agent Service     │        │
│  │   :8000                │        │
│  └─────────────────────────┘        │
└─────────────────────────────────────┘
```

**Multi-stage Dockerfiles:**
- **Backend**: Production dependencies only, non-root user, health checks
- **Frontend**: Built assets served via nginx, optimized bundle size
- **AI Agent**: Python 3.12 slim, optimized dependencies

### Cloud Services

**All services use cloud providers:**
- **PostgreSQL**: Supabase (managed PostgreSQL)
- **MongoDB**: MongoDB Atlas (managed MongoDB)
- **Redis**: Redis Cloud (managed Redis)
- **Kafka**: Aiven Cloud (managed Kafka with SSL/TLS)
- **Storage**: Firebase Storage (Google Cloud)
- **Hosting**: Docker containers (can deploy to AWS ECS/EKS, GCP, Azure)

### Kubernetes Deployment (infra2/)

**Kubernetes Resources:**
- **Namespace**: `kayak-platform`
- **Deployments**: Backend, Frontend, AI Agent
- **Services**: ClusterIP for internal communication
- **ConfigMaps**: Environment configuration
- **Secrets**: Sensitive data (database credentials, API keys)

---

## Security Architecture

### Authentication & Authorization

**JWT-Based Authentication:**
```
1. User logs in → Backend validates credentials
2. Backend generates JWT token (expires in 7 days)
3. Frontend stores token in memory/localStorage
4. Frontend includes token in Authorization header
5. Backend validates token on each request
```

**Role-Based Access Control (RBAC):**
- **user**: Regular traveler
- **admin**: System administrator
- **owner**: Property owner (can manage listings)
- **moderator**: Content moderator

**Protected Routes:**
- Middleware checks JWT token
- Middleware verifies user role
- Unauthorized requests return 401/403

### Security Measures

1. **Input Validation**
   - express-validator for request validation
   - Joi for schema validation
   - SQL injection prevention (parameterized queries)
   - XSS prevention (input sanitization)

2. **Rate Limiting**
   - 500 requests per 15 minutes (development)
   - 100 requests per 15 minutes (production)
   - Per-IP and per-user rate limiting

3. **Security Headers (Helmet)**
   - Content Security Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

4. **Data Protection**
   - Password hashing (bcrypt)
   - SSN validation and encryption
   - Secure session management
   - Environment variables for secrets

---

## Scalability & Performance

### Horizontal Scaling

**Stateless Services:**
- Backend API: Can scale horizontally (multiple instances)
- Frontend: Can serve via CDN
- AI Agent: Can scale independently

**Stateful Services:**
- Databases: Managed cloud services handle scaling
- Redis: Redis Cloud handles clustering
- Kafka: Aiven Cloud handles partitioning

### Performance Optimizations

1. **Caching Strategy**
   - Redis cache for frequently accessed data
   - TTL-based cache invalidation
   - Cache-aside pattern

2. **Database Optimization**
   - Indexes on frequently queried fields
   - Connection pooling
   - Query optimization

3. **Frontend Optimization**
   - Code splitting (route-based)
   - Lazy loading of components
   - Image optimization
   - Bundle size optimization

4. **API Optimization**
   - Response compression (gzip)
   - Pagination for large datasets
   - Field selection (projections)
   - Batch operations where possible

### Monitoring & Observability

**Metrics (Prometheus):**
- HTTP request metrics
- Database query metrics
- Cache hit/miss ratios
- Error rates

**Logging (Winston):**
- Structured logging
- Daily log rotation
- Log levels (error, warn, info, debug)

**Health Checks:**
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe
- Database connection checks
- External service checks

---

## Key Design Decisions

### 1. Monolithic API Gateway
**Decision**: Single Express.js application with service modules
**Rationale**: 
- Simpler deployment and development
- Easier to maintain for small team
- Can split into microservices later if needed

### 2. Multi-Database Architecture
**Decision**: PostgreSQL + MongoDB + Redis
**Rationale**:
- Each database optimized for specific use case
- PostgreSQL for ACID transactions
- MongoDB for flexible schema and analytics
- Redis for fast caching

### 3. Event-Driven Architecture
**Decision**: Kafka for async communication
**Rationale**:
- Decouples services
- Enables eventual consistency
- Supports real-time features (watches, notifications)

### 4. Cloud-First Approach
**Decision**: All services use cloud providers
**Rationale**:
- No local dependencies
- Managed services reduce operational overhead
- Automatic scaling and backups
- High availability

---

## Future Enhancements

1. **Microservices Migration**
   - Split monolithic backend into separate services
   - Service mesh (Istio) for service communication
   - API Gateway (Kong/AWS API Gateway)

2. **Real-Time Features**
   - WebSocket service for real-time notifications
   - Server-Sent Events (SSE) for live updates
   - WebRTC for video calls (customer support)

3. **Advanced Analytics**
   - Data warehouse (Snowflake/BigQuery)
   - Real-time analytics (Apache Flink)
   - Machine learning for recommendations

4. **CI/CD Pipeline**
   - GitHub Actions for automated testing
   - Automated deployments
   - Blue-green deployments

5. **Monitoring & Alerting**
   - Prometheus + Grafana dashboards
   - Distributed tracing (Jaeger)
   - Error tracking (Sentry)
   - Log aggregation (ELK stack)

---

## Summary

The Kayak clone is a **distributed, cloud-native travel booking platform** that combines:

- **Monolithic API Gateway** for simplicity
- **Multi-database architecture** for optimal performance
- **Event-driven communication** for scalability
- **Cloud-first infrastructure** for reliability
- **Modern frontend** for user experience
- **AI-powered features** for personalization

The architecture is designed to be:
- **Scalable**: Horizontal scaling capability
- **Reliable**: Cloud-managed services with high availability
- **Maintainable**: Clear separation of concerns
- **Secure**: Multiple layers of security
- **Performant**: Caching and optimization strategies

This design provides a solid foundation for a production-ready travel booking platform while maintaining flexibility for future enhancements.





