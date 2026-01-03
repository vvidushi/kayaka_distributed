# Authentication Setup

## Overview

The authentication system uses JWT tokens with role-based access control (RBAC).

## User Roles

- **user** - Default role for regular users
- **moderator** - Can moderate content and manage users
- **admin** - Full administrative access
- **suspended** - Account is suspended and cannot login

## Database Schema

Add the following columns to the `users` table:

```sql
ALTER TABLE users 
ADD COLUMN password_hash VARCHAR(255),
ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'suspended')),
ADD COLUMN last_login TIMESTAMP,
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP;
```

## API Endpoints

### Register

```
POST /api/v1/auth/register
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1-555-123-4567",
  "profileType": "traveler",
  "address": {
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "partnerProfile": null
}

Response:
{
  "code": "SUCCESS",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "loyaltyTier": "none",
      "profileType": "traveler",
      "requiresSsn": false,
      "hasSsnOnFile": false,
      "partnerDetails": null
    },
    "token": "jwt_token_here"
  }
}

**Note:** Selecting `profileType` as `property_owner` marks the account for property submissions. These users can skip SSN during registration but must provide it later through the compliance endpoint before publishing listings.

**Property Partner Example:**

```
{
  "email": "host@example.com",
  "password": "securePassword123",
  "firstName": "Jamie",
  "lastName": "Lee",
  "phoneNumber": "+1-555-456-7890",
  "profileType": "property_owner",
  "address": { ... },
  "partnerProfile": {
    "companyName": "SuperHost LLC",
    "contactName": "Jamie Lee",
    "contactEmail": "hello@superhost.io",
    "portfolioSize": 18,
    "website": "https://superhost.io"
  }
}
```
```

### Login

```
POST /api/v1/auth/login
Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "code": "SUCCESS",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "loyaltyTier": "none",
      "profileType": "traveler",
      "requiresSsn": false,
      "hasSsnOnFile": false
    },
    "token": "jwt_token_here"
  }
}
```

### Get Current User

```
GET /api/v1/auth/me
Authorization: Bearer <token>

Response:
{
  "code": "SUCCESS",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "loyaltyTier": "none",
    "profileType": "traveler",
    "requiresSsn": false,
    "hasSsnOnFile": false,
    "compliance": {
      "requiresSsn": false,
      "ssnOnFile": false,
      "verifiedAt": null
    },
    "partnerDetails": null,
    "profileImageUrl": null,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Refresh Token

```
POST /api/v1/auth/refresh
Authorization: Bearer <token>

Response:
{
  "code": "SUCCESS",
  "data": {
    "user": { ... },
    "token": "new_jwt_token"
  }
}
```

### Logout

```
POST /api/v1/auth/logout
Authorization: Bearer <token>

Response:
{
  "code": "SUCCESS",
  "message": "Logged out successfully"
}
```

## Middleware

### Authentication Middleware

```javascript
import { authenticateToken } from './middleware/auth.js';

router.get('/protected', authenticateToken, handler);
```

### Role-Based Middleware

```javascript
import { requireAdmin, requireModerator, requireRole } from './middleware/auth.js';

router.get('/admin-only', authenticateToken, requireAdmin, handler);
router.get('/moderator', authenticateToken, requireModerator, handler);
router.get('/custom', authenticateToken, requireRole('admin', 'moderator'), handler);
```

## Security Considerations

1. **Password Hashing**: Uses bcrypt with 12 salt rounds
2. **JWT Tokens**: Signed with secret key, expires in 24 hours (configurable)
3. **Suspended Accounts**: Cannot login or refresh tokens
4. **Token Storage**: Frontend should store tokens securely (httpOnly cookies recommended for production)

## Environment Variables

```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```
