const { test, expect } = require('@playwright/test');

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const traveler = {
  email: process.env.E2E_USER_EMAIL || 'e2e.traveler@test.kayak.com',
  password: process.env.E2E_USER_PASSWORD || 'TestTraveler123!',
};
const owner = {
  email: process.env.E2E_OWNER_EMAIL || 'e2e.owner@test.kayak.com',
  password: process.env.E2E_OWNER_PASSWORD || 'TestOwner123!',
};

const login = async (page, creds) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  await page.waitForURL(/(owner|bookings|home|\/$)/, { timeout: 10000 });
  await expect(page.locator('.avatar')).toBeVisible();
};

const startFlightBooking = async (page) => {
  await page.goto('/flights');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder(/from/i).first().fill('LAX');
  await page.getByPlaceholder(/to/i).first().fill('JFK');
  await page.getByRole('button', { name: /search/i }).first().click();
  await page.waitForTimeout(2000);

  const bookButton = page.getByRole('button', { name: /view deal|book|select|choose/i }).first();
  await expect(bookButton).toBeVisible();
  await bookButton.click();
  await page.waitForURL(/bookings/);
};

const fillBillingAndSendToPayment = async (page) => {
  const continueBtn = page.getByRole('button', { name: /continue to billing/i }).first();
  if (await continueBtn.count()) {
    await continueBtn.click();
  }

  await page.fill('input[placeholder="John"]', 'Test');
  await page.fill('input[placeholder="Doe"]', 'Traveler');
  await page.fill('input[placeholder="john.doe@example.com"]', traveler.email);
  await page.fill('input[placeholder="+1 (555) 123-4567"]', '+1 (555) 999-9999');
  await page.fill('input[placeholder="123 Main Street"]', '123 Test Street');
  const citySelect = page.locator('div.form-control:has(label:has-text("City")) select');
  if (await citySelect.count()) {
    await citySelect.selectOption({ label: 'New York City' });
  }
  const stateSelect = page.locator('div.form-control:has(label:has-text("State")) select');
  if (await stateSelect.count()) {
    await stateSelect.selectOption('NY');
  }
  await page.fill('input[placeholder="10001"]', '10001');

  await page.getByRole('button', { name: /continue to payment/i }).click();
  await page.waitForURL(/payments/, { timeout: 15000 });
};

const payForBooking = async (page) => {
  await expect(page.locator('.modal-box')).toBeVisible({ timeout: 8000 });
  await page.getByPlaceholder('1234 5678 9012 3456').fill('4242 4242 4242 4242');
  await page.getByPlaceholder('MM/YY').fill('12/30');
  await page.getByPlaceholder('123').fill('123');
  await page.getByPlaceholder('John Doe').fill('Test Traveler');
  await page.getByRole('button', { name: /pay now/i }).click();

  await page.waitForTimeout(2000);
  await page.waitForURL(/bookings/, { timeout: 15000 });
};

const refundLatestPayment = async (page) => {
  await page.goto('/payments');
  await page.waitForLoadState('networkidle');

  const refundButton = page.getByRole('button', { name: /^Refund$/i }).first();
  await expect(refundButton).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await refundButton.click();
  await expect(page.getByText(/refunded|refund/i)).toBeVisible({ timeout: 8000 });
};

const previewCarAndHotelDeals = async (page) => {
  await page.goto('/cars');
  await page.waitForLoadState('networkidle');
  const carDeal = page.getByRole('button', { name: /view deal/i }).first();
  await expect(carDeal).toBeVisible();
  await carDeal.click();
  await page.waitForURL(/bookings/);
  await expect(page.getByText(/car rental|car/i)).toBeVisible();
  await page.goBack();

  await page.goto('/hotels');
  await page.waitForLoadState('networkidle');
  const hotelDeal = page.getByRole('button', { name: /view deal/i }).first();
  await expect(hotelDeal).toBeVisible();
  await hotelDeal.click();
  await page.waitForURL(/bookings/);
  await expect(page.getByText(/hotel/i)).toBeVisible();
};

const addOwnerCarAndAnalytics = async (browser) => {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await login(page, owner);
  await page.goto('/owner/cars/new');
  await page.waitForLoadState('networkidle');

  await page.getByLabel(/vendor/i).selectOption({ label: 'Hertz' });
  await page.getByLabel(/car type/i).selectOption({ label: 'SUV' });
  await page.getByLabel(/location/i).fill('San Francisco, CA');
  await page.getByLabel(/number of seats/i).fill('4');
  await page.getByLabel(/price per day/i).fill('75');
  await page.getByLabel(/description/i).fill('Playwright automated test listing.');
  await page.getByRole('button', { name: /submit for approval/i }).click();
  await page.waitForURL(/owner\/cars/, { timeout: 10000 });

  await page.goto('/analytics');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/analytics dashboard/i)).toBeVisible();

  await context.close();
};

test.describe('Unified traveler + owner flows', () => {
  test('books flight, pays, refunds, explores cars/hotels, owner adds car & views analytics', async ({ page, browser }) => {
    test.setTimeout(180000);

    await login(page, traveler);
    await startFlightBooking(page);
    await fillBillingAndSendToPayment(page);
    await payForBooking(page);
    await refundLatestPayment(page);
    await previewCarAndHotelDeals(page);
    await addOwnerCarAndAnalytics(browser);
  });
});
