/**
 * Test Credentials for E2E Tests
 * These credentials are created by the seed-test-users script
 */

export const TEST_CREDENTIALS = {
  TRAVELER: {
    email: 'e2e.traveler@test.kayak.com',
    password: 'TestTraveler123!',
  },
  OWNER: {
    email: 'e2e.owner@test.kayak.com',
    password: 'TestOwner123!',
  },
  ADMIN: {
    email: 'e2e.admin@test.kayak.com',
    password: 'TestAdmin123!',
  },
};

// Set as environment variables if not already set
if (!process.env.E2E_USER_EMAIL) {
  process.env.E2E_USER_EMAIL = TEST_CREDENTIALS.TRAVELER.email;
}

if (!process.env.E2E_USER_PASSWORD) {
  process.env.E2E_USER_PASSWORD = TEST_CREDENTIALS.TRAVELER.password;
}

if (!process.env.E2E_OWNER_EMAIL) {
  process.env.E2E_OWNER_EMAIL = TEST_CREDENTIALS.OWNER.email;
}

if (!process.env.E2E_OWNER_PASSWORD) {
  process.env.E2E_OWNER_PASSWORD = TEST_CREDENTIALS.OWNER.password;
}

if (!process.env.E2E_ADMIN_EMAIL) {
  process.env.E2E_ADMIN_EMAIL = TEST_CREDENTIALS.ADMIN.email;
}

if (!process.env.E2E_ADMIN_PASSWORD) {
  process.env.E2E_ADMIN_PASSWORD = TEST_CREDENTIALS.ADMIN.password;
}

