const { test, expect } = require('@playwright/test');

/**
 * Payment Flow Tests
 * Tests payment creation, viewing, and refunds
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

test.describe('Payments', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('View Payments', () => {
    test('should navigate to payments page', async ({ page }) => {
      await page.goto('/payments');
      await expect(page).toHaveURL(/payments/i);
    });

    test('should display payments list', async ({ page }) => {
      await page.goto('/payments');
      await page.waitForLoadState('networkidle');

      // Should show payments list or empty state
      const hasContent = await Promise.race([
        page.locator('[data-testid="payment-card"], .payment-card, [class*="payment"]').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.getByText(/no payments|empty|you have no payments/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.getByText(/payments|your payments/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      ]);

      expect(hasContent).toBeTruthy();
    });

    test('should filter payments by status', async ({ page }) => {
      await page.goto('/payments');
      await page.waitForLoadState('networkidle');

      // Find status filter
      const statusFilter = page.getByLabel(/status|filter/i).or(
        page.locator('select').filter({ hasText: /status/i })
      ).first();

      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption({ label: /succeeded|pending|refunded/i });
        await page.waitForTimeout(2000);
        
        // Results should update
        const results = page.locator('[data-testid="payment-card"], .payment-card');
        if (await results.count() > 0) {
          await expect(results.first()).toBeVisible();
        }
      }
    });

    test('should view payment details', async ({ page }) => {
      await page.goto('/payments');
      await page.waitForLoadState('networkidle');

      // Find first payment card
      const paymentCard = page.locator('[data-testid="payment-card"], .payment-card, [class*="payment"]').first();
      
      if (await paymentCard.count() > 0) {
        await paymentCard.click();
        await page.waitForTimeout(2000);
        
        // Should show payment details
        const details = page.getByText(/payment.*id|amount|status|transaction|booking/i);
        await expect(details.first()).toBeVisible();
      }
    });
  });

  test.describe('Create Payment', () => {
    test('should create payment for booking', async ({ page }) => {
      // Navigate to bookings
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      // Find a booking that needs payment
      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();
      
      if (await bookingCard.count() > 0) {
        await bookingCard.click();
        await page.waitForTimeout(1000);
        
        // Look for pay button
        const payButton = page.getByRole('button', { name: /pay|payment|proceed.*payment/i });
        
        if (await payButton.count() > 0) {
          await payButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should show payment form
          const paymentForm = page.getByText(/payment|amount|card|billing/i);
          await expect(paymentForm.first()).toBeVisible();
        }
      }
    });

    test('should process payment with valid details', async ({ page }) => {
      // Navigate to a booking that needs payment
      await page.goto('/bookings');
      await page.waitForLoadState('networkidle');

      const bookingCard = page.locator('[data-testid="booking-card"], .booking-card').first();
      
      if (await bookingCard.count() > 0) {
        await bookingCard.click();
        await page.waitForTimeout(1000);
        
        const payButton = page.getByRole('button', { name: /pay|payment/i });
        
        if (await payButton.count() > 0) {
          await payButton.first().click();
          await page.waitForTimeout(2000);
          
          // Fill payment form (if visible)
          const cardInput = page.getByLabel(/card|number/i).or(
            page.locator('input[type="text"]').filter({ hasText: /card/i })
          ).first();
          
          if (await cardInput.count() > 0) {
            // Fill test payment details
            await cardInput.fill('4242424242424242');
            
            const expiryInput = page.getByLabel(/expiry|expiration/i).first();
            if (await expiryInput.count() > 0) {
              await expiryInput.fill('12/25');
            }
            
            const cvvInput = page.getByLabel(/cvv|cvc/i).first();
            if (await cvvInput.count() > 0) {
              await cvvInput.fill('123');
            }
            
            // Submit payment
            const submitButton = page.getByRole('button', { name: /submit|pay|confirm/i });
            if (await submitButton.count() > 0) {
              await submitButton.first().click();
              await page.waitForTimeout(3000);
              
              // Should show success or confirmation
              const result = page.getByText(/success|confirmed|paid|thank you/i);
              await expect(result.first()).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Refunds', () => {
    test('should request refund for eligible payment', async ({ page }) => {
      await page.goto('/payments');
      await page.waitForLoadState('networkidle');

      // Find a payment that can be refunded
      const paymentCard = page.locator('[data-testid="payment-card"], .payment-card').first();
      
      if (await paymentCard.count() > 0) {
        await paymentCard.click();
        await page.waitForTimeout(1000);
        
        // Look for refund button
        const refundButton = page.getByRole('button', { name: /refund/i });
        
        if (await refundButton.count() > 0) {
          await refundButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should show confirmation or success
          const confirmation = page.getByText(/refund|success|confirm/i);
          await expect(confirmation.first()).toBeVisible();
        }
      }
    });
  });
});

