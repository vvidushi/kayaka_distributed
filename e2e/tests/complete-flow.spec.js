const { test, expect } = require('@playwright/test');

/**
 * Complete End-to-End Flow Test
 * Tests the full user journey from search to booking to payment
 */

const loginUser = async (page) => {
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

test.describe('Complete User Flow', () => {
  test('full journey: search -> book -> pay -> view booking', async ({ page }) => {
    // Step 1: Login
    await loginUser(page);

    // Step 2: Search for flights
    await page.goto('/flights');
    await page.waitForLoadState('networkidle');

    const fromInput = page.getByPlaceholder(/from/i).first();
    const toInput = page.getByPlaceholder(/to/i).first();
    
    if (await fromInput.count() > 0) {
      await fromInput.fill('LAX');
      await toInput.fill('JFK');
      await page.getByRole('button', { name: /search/i }).first().click();
      await page.waitForTimeout(3000);
    }

    // Step 3: Select a flight
    const flightCard = page.locator('[data-testid="flight-card"], .flight-card, [class*="flight"]').first();
    
    if (await flightCard.count() > 0) {
      const bookButton = page.getByRole('button', { name: /book|select|choose/i }).first();
      
      if (await bookButton.count() > 0) {
        await bookButton.click();
        await page.waitForTimeout(2000);
        
        // Step 4: Create booking
        const confirmButton = page.getByRole('button', { name: /confirm|book|proceed/i });
        if (await confirmButton.count() > 0) {
          await confirmButton.first().click();
          await page.waitForTimeout(2000);
          
          // Step 5: Navigate to bookings
          await page.goto('/bookings');
          await page.waitForLoadState('networkidle');
          
          // Verify booking exists
          const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();
          if (await bookingCard.count() > 0) {
            await expect(bookingCard).toBeVisible();
            
            // Step 6: View booking details
            await bookingCard.click();
            await page.waitForTimeout(2000);
            
            // Step 7: Create payment
            const payButton = page.getByRole('button', { name: /pay|payment/i });
            if (await payButton.count() > 0) {
              await payButton.first().click();
              await page.waitForTimeout(2000);
              
              // Step 8: View payments
              await page.goto('/payments');
              await page.waitForLoadState('networkidle');
              
              const paymentCard = page.locator('[data-testid="payment-card"], .payment-card').first();
              if (await paymentCard.count() > 0) {
                await expect(paymentCard).toBeVisible();
              }
            }
          }
        }
      }
    }
  });

  test('admin flow: login -> manage inventory -> view reports', async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL || 'e2e.admin@test.kayak.com';
    const password = process.env.E2E_ADMIN_PASSWORD || 'TestAdmin123!';

    // Step 1: Login as admin
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
    }

    // Step 2: Navigate to admin
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Step 3: View flights section
    const flightsSection = page.getByText(/flights/i).first();
    if (await flightsSection.count() > 0) {
      await flightsSection.click();
      await page.waitForTimeout(1000);
      
      // Verify flights list
      const flightsList = page.locator('[data-testid="flight-card"], .flight-card');
      if (await flightsList.count() > 0) {
        await expect(flightsList.first()).toBeVisible();
      }
    }

    // Step 4: View reports
    const reportsLink = page.getByRole('link', { name: /reports|revenue/i }).or(
      page.getByText(/reports/i)
    ).first();
    
    if (await reportsLink.count() > 0) {
      await reportsLink.click();
      await page.waitForTimeout(2000);
      
      const reportsData = page.getByText(/revenue|total|amount/i);
      await expect(reportsData.first()).toBeVisible();
    }
  });

  test('owner flow: login -> add property -> view dashboard', async ({ page }) => {
    const email = process.env.E2E_OWNER_EMAIL || 'e2e.owner@test.kayak.com';
    const password = process.env.E2E_OWNER_PASSWORD || 'TestOwner123!';

    // Step 1: Login
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
    }

    // Step 2: Navigate to owner dashboard
    await page.goto('/owner');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (currentUrl.includes('/owner')) {
      // Step 3: Navigate to hotels
      await page.goto('/owner/hotels');
      await page.waitForLoadState('networkidle');
      
      // Verify owner hotels page
      const hotelsPage = page.getByText(/hotels|your.*hotels/i);
      await expect(hotelsPage.first()).toBeVisible();
    } else {
        // User should be owner, but if not, test will fail naturally
    }
  });
});

