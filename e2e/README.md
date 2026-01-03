# E2E Tests for Kayak Platform

This directory contains end-to-end tests using Playwright.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Set up test users:**
   ```bash
   # Make sure backend is running and has MONGODB_URI set
   cd ../backend
   npm run seed:test-users
   ```

   Or run it automatically before tests (configured in `playwright.config.js`):
   ```bash
   npm test
   ```

## Test Credentials

The following test users are automatically created:

- **Traveler User:**
  - Email: `e2e.traveler@test.kayak.com`
  - Password: `TestTraveler123!`

- **Owner User:**
  - Email: `e2e.owner@test.kayak.com`
  - Password: `TestOwner123!`

- **Admin User:**
  - Email: `e2e.admin@test.kayak.com`
  - Password: `TestAdmin123!`

These credentials are automatically set as environment variables in `playwright.config.js`.

## Running Tests

```bash
# Run all tests
npm test

# Run in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test tests/auth.spec.js

# Run with debug
npm run test:debug

# View HTML report
npm run test:report
```

## Test Structure

- `tests/auth.spec.js` - Authentication flows
- `tests/listings.spec.js` - Search functionality
- `tests/bookings.spec.js` - Booking management
- `tests/payments.spec.js` - Payment processing
- `tests/profile.spec.js` - Profile management
- `tests/admin.spec.js` - Admin operations
- `tests/owner.spec.js` - Owner portal
- `tests/concierge.spec.js` - Concierge service
- `tests/errors.spec.js` - Error handling
- `tests/complete-flow.spec.js` - End-to-end user journeys

## Configuration

Tests are configured in `playwright.config.js`:
- Base URL: `http://localhost:5173` (or set `E2E_BASE_URL`)
- Videos: Disabled
- Screenshots: On failure only
- Timeout: 60 seconds per test

## Notes

- Tests automatically create test users before running (via `globalSetup`)
- All tests use the default test credentials unless overridden via environment variables
- Tests clean up old reports automatically
