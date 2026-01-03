// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright configuration for Kayak E2E tests.
 *
 * Assumptions:
 * - Frontend is running at http://localhost:5173 (Docker or dev server)
 * - Backend is running at http://localhost:3000
 *
 * You can override the base URL with the E2E_BASE_URL environment variable.
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

// Test credentials (created by seed-test-users script)
const TEST_CREDENTIALS = {
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

// Set default test credentials if not provided via env
if (!process.env.E2E_USER_EMAIL) {
  process.env.E2E_USER_EMAIL = TEST_CREDENTIALS.TRAVELER.email;
  process.env.E2E_USER_PASSWORD = TEST_CREDENTIALS.TRAVELER.password;
}

if (!process.env.E2E_OWNER_EMAIL) {
  process.env.E2E_OWNER_EMAIL = TEST_CREDENTIALS.OWNER.email;
  process.env.E2E_OWNER_PASSWORD = TEST_CREDENTIALS.OWNER.password;
}

if (!process.env.E2E_ADMIN_EMAIL) {
  process.env.E2E_ADMIN_EMAIL = TEST_CREDENTIALS.ADMIN.email;
  process.env.E2E_ADMIN_PASSWORD = TEST_CREDENTIALS.ADMIN.password;
}

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 720 },
  },
  globalSetup: './setup-test-users.js',
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
});


