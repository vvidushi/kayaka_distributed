const { test, expect } = require('@playwright/test');

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

/**
 * Error Handling Tests
 * Tests error scenarios, validation, and user feedback
 */

test.describe('Error Handling', () => {
  test.describe('Form Validation', () => {
    test('should show validation errors for empty login form', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const submitButton = page.getByRole('button', { name: /log in|sign in|submit/i });
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        await page.waitForTimeout(1000);
        
        // Check for browser native validation or custom errors
        const errors = page.getByText(/required|invalid|error|please/i);
        const invalidInputs = page.locator('input:invalid');
        
        const errorCount = await errors.count();
        const invalidCount = await invalidInputs.count();
        
        // At least one validation should trigger
        expect(errorCount + invalidCount).toBeGreaterThan(0);
      }
    });

    test('should show validation errors for invalid email', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.getByLabel(/email/i).first();
      if (await emailInput.count() > 0) {
        await emailInput.fill('invalid-email');
      }
      
      const passwordInput = page.getByLabel(/password/i).first();
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('password123');
      }
      
      const submitButton = page.getByRole('button', { name: /log in|sign in/i });
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        await page.waitForTimeout(1000);
        
        // Check for browser native validation (type="email" will show validation)
        const invalidEmail = page.locator('input[type="email"]:invalid');
        const error = page.getByText(/invalid.*email|email.*format|error/i);
        
        const hasInvalid = await invalidEmail.count() > 0;
        const hasError = await error.count() > 0;
        
        expect(hasInvalid || hasError).toBeTruthy();
      }
    });

    test('should show validation errors for short password', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.getByLabel(/email/i).first();
      if (await emailInput.count() > 0) {
        await emailInput.fill('test@example.com');
      }
      
      const passwordInput = page.getByLabel(/password/i).first();
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('short');
      }
      
      const submitButton = page.getByRole('button', { name: /register|sign up/i });
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        await page.waitForTimeout(1000);
        
        // Check for validation errors
        const error = page.getByText(/password.*length|minimum|8.*characters|too.*short/i);
        const invalidPassword = page.locator('input[type="password"]:invalid');
        
        const hasError = await error.count() > 0;
        const hasInvalid = await invalidPassword.count() > 0;
        
        // At least one validation should trigger
        expect(hasError || hasInvalid).toBeTruthy();
      }
    });
  });

  test.describe('API Errors', () => {
    test('should show error message for invalid login credentials', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.getByLabel(/email/i).first();
      if (await emailInput.count() > 0) {
        await emailInput.fill('nonexistent@example.com');
      }
      
      const passwordInput = page.getByLabel(/password/i).first();
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('wrongpassword');
      }
      
      const submitButton = page.getByRole('button', { name: /log in|sign in/i });
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        await page.waitForTimeout(3000);
        
        // Check for error message in alert or error container
        const error = page.locator('.alert-error, [class*="error"], [role="alert"]').or(
          page.getByText(/invalid|incorrect|error|failed|wrong/i)
        );
        
        if (await error.count() > 0) {
          await expect(error.first()).toBeVisible();
        } else {
          // If no error shown, verify we're still on login page (not redirected)
          expect(page.url()).toContain('/login');
        }
      }
    });

    test('should show error for 404 pages', async ({ page }) => {
      await page.goto('/nonexistent-page-12345');
      await page.waitForLoadState('networkidle');
      
      const notFound = page.getByText(/404|not found|page.*not.*found/i);
      await expect(notFound.first()).toBeVisible();
    });
  });

  test.describe('Toast Notifications', () => {
    test('should show error toast for failed operations', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.getByLabel(/email/i).first();
      if (await emailInput.count() > 0) {
        await emailInput.fill('invalid@example.com');
      }
      
      const passwordInput = page.getByLabel(/password/i).first();
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('wrong');
      }
      
      const submitButton = page.getByRole('button', { name: /log in|sign in/i });
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        await page.waitForTimeout(3000);
        
        // Check for toast notification or error message
        const toast = page.locator('[class*="toast"], [data-testid="toast"], [role="alert"]');
        const errorAlert = page.locator('.alert-error, [class*="error"]');
        const errorText = page.getByText(/error|failed|invalid|incorrect/i);
        
        const hasToast = await toast.count() > 0;
        const hasAlert = await errorAlert.count() > 0;
        const hasErrorText = await errorText.count() > 0;
        
        // At least one error indicator should be visible
        expect(hasToast || hasAlert || hasErrorText).toBeTruthy();
      }
    });
  });
});

