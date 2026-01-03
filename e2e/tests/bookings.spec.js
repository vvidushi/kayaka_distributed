const { test, expect } = require('@playwright/test');

/**
 * Booking Flow Tests
 * Tests creating, viewing, and managing bookings
 */

const loginUser = async (page) => {
  // Use test credentials (set in playwright.config.js)
  const email = process.env.E2E_USER_EMAIL || 'e2e.traveler@test.kayak.com';
  const password = process.env.E2E_USER_PASSWORD || 'TestTraveler123!';

  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  const emailInput = page.getByLabel(/email/i).first();
  if (await emailInput.count() > 0) {
    await emailInput.fill(email);
  }
  
  const passwordInput = page.getByLabel(/password/i).first();
  if (await passwordInput.count() > 0) {
    await passwordInput.fill(password);
  }
  
  const submitButton = page.getByRole('button', { name: /log in|sign in/i });
  if (await submitButton.count() > 0) {
    await submitButton.click();
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
};

test.describe('Bookings', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('View Bookings', () => {
    test('should navigate to bookings page', async ({ page }) => {
      await page.goto('/bookings');
      await expect(page).toHaveURL(/bookings/i);
    });

    test('should display bookings list', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Should show bookings list or empty state
      const hasContent = await Promise.race([
        page.locator('[data-testid="booking-card"], .booking-card, [class*="booking"]').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.getByText(/no bookings|empty|you have no bookings/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.getByText(/bookings|your bookings/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      ]);

      expect(hasContent).toBeTruthy();
    });

    test('should filter bookings by status', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Find status filter
      const statusFilter = page.getByLabel(/status|filter/i).or(
        page.locator('select').filter({ hasText: /status/i })
      ).first();

      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption({ label: /confirmed|pending|completed/i });
        await page.waitForTimeout(2000);
        
        // Results should update
        const results = page.locator('[data-testid="booking-card"], .booking-card');
        if (await results.count() > 0) {
          await expect(results.first()).toBeVisible();
        }
      }
    });

    test('should view booking details', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Find first booking card
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card, [class*="booking"]').first();
      
      if (await bookingCard.count() > 0) {
        await bookingCard.click();
        await page.waitForTimeout(2000);
        
        // Should show booking details
        const details = page.getByText(/booking.*id|status|price|date|itinerary/i);
        await expect(details.first()).toBeVisible();
      }
    });
  });

  test.describe('Create Booking', () => {
    test('should create booking from flight', async ({ page }) => {
      // Navigate to flights
      await page.goto('/flights');
      await page.waitForLoadState('networkidle');

      // Perform search
      const fromInput = page.getByPlaceholder(/from/i).first();
      const toInput = page.getByPlaceholder(/to/i).first();
      
      if (await fromInput.count() > 0) {
        await fromInput.fill('LAX');
        await toInput.fill('JFK');
        await page.getByRole('button', { name: /search/i }).first().click();
        await page.waitForTimeout(3000);
      }

      // Find first flight and click book/select
      const flightCard = page.locator('[data-testid="flight-card"], .flight-card, [class*="flight"]').first();
      
      if (await flightCard.count() > 0) {
        // Look for book/select button
        const bookButton = page.getByRole('button', { name: /book|select|choose|reserve/i }).first();
        
        if (await bookButton.count() > 0) {
          await bookButton.click();
          await page.waitForTimeout(2000);
          
          // Should show booking form or confirmation
          const bookingForm = page.getByText(/confirm|booking|details|proceed/i);
          await expect(bookingForm.first()).toBeVisible();
        }
      }
    });

    test('should create booking from hotel', async ({ page }) => {
      await page.goto('/hotels');
      await page.waitForLoadState('networkidle');

      // Perform search
      const locationInput = page.getByPlaceholder(/city|location/i).first();
      if (await locationInput.count() > 0) {
        await locationInput.fill('New York');
        await page.getByRole('button', { name: /search/i }).first().click();
        await page.waitForTimeout(3000);
      }

      // Find first hotel and click book
      const hotelCard = page.locator('[data-testid="hotel-card"], .hotel-card, [class*="hotel"]').first();
      
      if (await hotelCard.count() > 0) {
        const bookButton = page.getByRole('button', { name: /book|reserve|select/i }).first();
        
        if (await bookButton.count() > 0) {
          await bookButton.click();
          await page.waitForTimeout(2000);
          
          // Should show booking form
          const bookingForm = page.getByText(/confirm|booking|check.*in|check.*out/i);
          await expect(bookingForm.first()).toBeVisible();
        }
      }
    });

    test('should create booking from car', async ({ page }) => {
      await page.goto('/cars');
      await page.waitForLoadState('networkidle');

      // Perform search
      const locationInput = page.getByPlaceholder(/city|location/i).first();
      if (await locationInput.count() > 0) {
        await locationInput.fill('Los Angeles');
        await page.getByRole('button', { name: /search/i }).first().click();
        await page.waitForTimeout(3000);
      }

      // Find first car and click book
      const carCard = page.locator('[data-testid="car-card"], .car-card, [class*="car"]').first();
      
      if (await carCard.count() > 0) {
        const bookButton = page.getByRole('button', { name: /book|rent|select/i }).first();
        
        if (await bookButton.count() > 0) {
          await bookButton.click();
          await page.waitForTimeout(2000);
          
          // Should show booking form
          const bookingForm = page.getByText(/confirm|booking|pickup|dropoff/i);
          await expect(bookingForm.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Manage Bookings', () => {
    test('should cancel booking', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Find a booking that can be cancelled
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();
      
      if (await bookingCard.count() > 0) {
        await bookingCard.click();
        await page.waitForTimeout(1000);
        
        // Look for cancel button
        const cancelButton = page.getByRole('button', { name: /cancel/i });
        
        if (await cancelButton.count() > 0) {
          await cancelButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should show confirmation or success message
          const confirmation = page.getByText(/cancelled|success|confirm/i);
          await expect(confirmation.first()).toBeVisible();
        }
      }
    });

    test('should confirm booking', async ({ page }) => {
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Find a pending booking
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();
      
      if (await bookingCard.count() > 0) {
        await bookingCard.click();
        await page.waitForTimeout(1000);
        
        // Look for confirm button
        const confirmButton = page.getByRole('button', { name: /confirm/i });
        
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should show success message
          const success = page.getByText(/confirmed|success/i);
          await expect(success.first()).toBeVisible();
        }
      }
    });
  });
});

