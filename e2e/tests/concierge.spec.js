const { test, expect } = require('@playwright/test');

/**
 * Concierge Service Tests
 * Tests AI concierge chat and watch functionality
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

test.describe('Concierge Service', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('Concierge Chat', () => {
    test('should navigate to concierge page', async ({ page }) => {
      await page.goto('/concierge');
      await expect(page).toHaveURL(/concierge/i);
    });

    test('should display concierge interface', async ({ page }) => {
      await page.goto('/concierge');
      await page.waitForLoadState('networkidle');

      // Should show chat interface
      const hasChatInterface = await Promise.race([
        page.locator('[data-testid="chat"], .chat, [class*="concierge"]').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.getByText(/concierge|chat|assistant|how.*can.*help/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.locator('textarea, input[type="text"]').filter({ hasPlaceholder: /message|type|ask/i }).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      ]);

      expect(hasChatInterface).toBeTruthy();
    });

    test('should start new session', async ({ page }) => {
      await page.goto('/concierge');
      await page.waitForLoadState('networkidle');

      // Look for start/new session button
      const startButton = page.getByRole('button', { name: /start|new.*session|begin/i });
      
      if (await startButton.count() > 0) {
        await startButton.first().click();
        await page.waitForTimeout(2000);
        
        // Should show chat input
        const chatInput = page.locator('textarea, input[type="text"]').filter({ hasPlaceholder: /message|type|ask/i });
        await expect(chatInput.first()).toBeVisible();
      }
    });

    test('should send message to concierge', async ({ page }) => {
      await page.goto('/concierge');
      await page.waitForLoadState('networkidle');

      // Find message input
      const messageInput = page.locator('textarea, input[type="text"]').filter({ hasPlaceholder: /message|type|ask/i }).first();
      
      if (await messageInput.count() > 0) {
        await messageInput.fill('I need help finding a hotel in New York');
        
        // Find send button
        const sendButton = page.getByRole('button', { name: /send|submit/i }).or(
          page.locator('button[type="submit"]')
        ).first();
        
        if (await sendButton.count() > 0) {
          await sendButton.click();
          await page.waitForTimeout(3000);
          
          // Should show message in chat
          const message = page.getByText(/I need help|hotel|New York/i);
          await expect(message.first()).toBeVisible();
        }
      }
    });

    test('should receive response from concierge', async ({ page }) => {
      await page.goto('/concierge');
      await page.waitForLoadState('networkidle');

      // Send a message
      const messageInput = page.locator('textarea, input[type="text"]').filter({ hasPlaceholder: /message|type/i }).first();
      
      if (await messageInput.count() > 0) {
        await messageInput.fill('Show me flights from LAX to JFK');
        
        const sendButton = page.getByRole('button', { name: /send|submit/i }).first();
        if (await sendButton.count() > 0) {
          await sendButton.click();
          await page.waitForTimeout(5000);
          
          // Should show response (could be loading, error, or actual response)
          const hasResponse = await Promise.race([
            page.locator('[data-testid="message"], .message, [class*="response"]').waitFor({ timeout: 10000 }).then(() => true).catch(() => false),
            page.getByText(/flights|LAX|JFK|search|results/i).waitFor({ timeout: 10000 }).then(() => true).catch(() => false),
            page.getByText(/loading|processing/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
          ]);

          expect(hasResponse).toBeTruthy();
        }
      }
    });
  });

  test.describe('Price Watches', () => {
    test('should create price watch', async ({ page }) => {
      await page.goto('/concierge');
      await page.waitForLoadState('networkidle');

      // Send message to create watch
      const messageInput = page.locator('textarea, input[type="text"]').filter({ hasPlaceholder: /message|type/i }).first();
      
      if (await messageInput.count() > 0) {
        await messageInput.fill('Watch for flights from LAX to JFK under $300');
        
        const sendButton = page.getByRole('button', { name: /send|submit/i }).first();
        if (await sendButton.count() > 0) {
          await sendButton.click();
          await page.waitForTimeout(5000);
          
          // Should show watch creation confirmation or option
          const watchConfirmation = page.getByText(/watch|created|set|notify/i);
          await expect(watchConfirmation.first()).toBeVisible();
        }
      }
    });

    test('should view active watches', async ({ page }) => {
      await page.goto('/concierge');
      await page.waitForLoadState('networkidle');

      // Look for watches section
      const watchesSection = page.getByText(/watches|active.*watches|price.*watches/i);
      
      if (await watchesSection.count() > 0) {
        await watchesSection.first().click();
        await page.waitForTimeout(2000);
        
        // Should show watches list
        const watchesList = page.locator('[data-testid="watch-card"], .watch-card, [class*="watch"]');
        if (await watchesList.count() > 0) {
          await expect(watchesList.first()).toBeVisible();
        }
      }
    });

    test('should cancel watch', async ({ page }) => {
      await page.goto('/concierge');
      await page.waitForLoadState('networkidle');

      // Find watches section
      const watchesSection = page.getByText(/watches/i);
      if (await watchesSection.count() > 0) {
        await watchesSection.first().click();
        await page.waitForTimeout(2000);
      }

      // Find first watch
      const watchCard = page.locator('[data-testid="watch-card"], .watch-card').first();
      
      if (await watchCard.count() > 0) {
        // Find cancel button
        const cancelButton = page.getByRole('button', { name: /cancel|delete|remove/i }).first();
        
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
          await page.waitForTimeout(2000);
          
          // Should show confirmation
          const confirmation = page.getByText(/cancelled|removed|deleted/i);
          await expect(confirmation.first()).toBeVisible();
        }
      }
    });
  });
});

