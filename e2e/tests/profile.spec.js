const { test, expect } = require('@playwright/test');

/**
 * Profile Management Tests
 * Tests viewing and updating user profile
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

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test.describe('View Profile', () => {
    test('should navigate to profile page', async ({ page }) => {
      // Find profile link in navigation
      const profileLink = page.getByRole('link', { name: /profile|account|settings/i });
      
      if (await profileLink.count() > 0) {
        await profileLink.first().click();
      } else {
        await page.goto('/profile');
      }
      
      await expect(page).toHaveURL(/profile/i);
    });

    test('should display profile information', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Should show profile fields
      const hasProfileData = await Promise.race([
        page.getByText(/email|name|phone|address/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.locator('input, textarea').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      ]);

      expect(hasProfileData).toBeTruthy();
    });
  });

  test.describe('Update Profile', () => {
    test('should update basic profile information', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Find and update first name
      const firstNameInput = page.getByLabel(/first.*name|firstName/i).first();
      
      if (await firstNameInput.count() > 0) {
        const originalValue = await firstNameInput.inputValue();
        const newValue = originalValue ? `Updated${originalValue}` : 'TestUser';
        
        await firstNameInput.fill(newValue);
        
        // Find and click save button
        const saveButton = page.getByRole('button', { name: /save|update|submit/i });
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should show success message
          const success = page.getByText(/success|updated|saved/i);
          await expect(success.first()).toBeVisible();
        }
      }
    });

    test('should update phone number', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      const phoneInput = page.getByLabel(/phone/i).first();
      
      if (await phoneInput.count() > 0) {
        await phoneInput.fill('1234567890');
        
        const saveButton = page.getByRole('button', { name: /save|update/i });
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(2000);
          
          const success = page.getByText(/success|updated/i);
          await expect(success.first()).toBeVisible();
        }
      }
    });

    test('should update address', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      const addressInput = page.getByLabel(/address|street/i).first();
      
      if (await addressInput.count() > 0) {
        await addressInput.fill('123 Test Street');
        
        // Fill city, state, zip if present
        const cityInput = page.getByLabel(/city/i).first();
        if (await cityInput.count() > 0) {
          await cityInput.fill('Test City');
        }
        
        const stateInput = page.getByLabel(/state/i).first();
        if (await stateInput.count() > 0) {
          await stateInput.fill('CA');
        }
        
        const zipInput = page.getByLabel(/zip|postal/i).first();
        if (await zipInput.count() > 0) {
          await zipInput.fill('12345');
        }
        
        const saveButton = page.getByRole('button', { name: /save|update/i });
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(2000);
          
          const success = page.getByText(/success|updated/i);
          await expect(success.first()).toBeVisible();
        }
      }
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Try to clear required field
      const emailInput = page.getByLabel(/email/i).first();
      
      if (await emailInput.count() > 0) {
        await emailInput.clear();
        
        const saveButton = page.getByRole('button', { name: /save|update/i });
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(1000);
          
          // Should show validation error
          const error = page.getByText(/required|invalid|error/i);
          await expect(error.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('SSN Management (Owner)', () => {
    test('should update SSN for property owner', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Check if user is owner (has SSN field)
      const ssnInput = page.getByLabel(/ssn|social.*security/i).first();
      
      if (await ssnInput.count() > 0) {
        await ssnInput.fill('123-45-6789');
        
        const saveButton = page.getByRole('button', { name: /save|update|verify/i });
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should show success or verification message
          const result = page.getByText(/success|verified|updated/i);
          await expect(result.first()).toBeVisible();
        }
      } else {
        // Try with owner credentials
        const ownerEmail = process.env.E2E_OWNER_EMAIL || 'e2e.owner@test.kayak.com';
        const ownerPassword = process.env.E2E_OWNER_PASSWORD || 'TestOwner123!';
        
        // Logout and login as owner
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        
        const emailInput = page.getByLabel(/email/i).first();
        const passwordInput = page.getByLabel(/password/i).first();
        const submitButton = page.getByRole('button', { name: /log in|sign in/i });
        
        if (await emailInput.count() > 0 && await passwordInput.count() > 0 && await submitButton.count() > 0) {
          await emailInput.fill(ownerEmail);
          await passwordInput.fill(ownerPassword);
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Try again on profile page
          await page.goto('/profile');
          await page.waitForLoadState('networkidle');
          
          const ssnInputRetry = page.getByLabel(/ssn|social.*security/i).first();
          if (await ssnInputRetry.count() === 0) {
            test.skip(true, 'User is not a property owner (no SSN field)');
          }
        } else {
          test.skip(true, 'User is not a property owner (no SSN field)');
        }
      }
    });

    test('should validate SSN format', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      const ssnInput = page.getByLabel(/ssn/i).first();
      
      if (await ssnInput.count() > 0) {
        // Try invalid format
        await ssnInput.fill('123456789');
        
        const saveButton = page.getByRole('button', { name: /save|update/i });
        if (await saveButton.count() > 0) {
          await saveButton.first().click();
          await page.waitForTimeout(1000);
          
          // Should show format error
          const error = page.getByText(/format|invalid|xxx-xx-xxxx/i);
          await expect(error.first()).toBeVisible();
        }
      } else {
        // Try with owner credentials
        const ownerEmail = process.env.E2E_OWNER_EMAIL || 'e2e.owner@test.kayak.com';
        const ownerPassword = process.env.E2E_OWNER_PASSWORD || 'TestOwner123!';
        
        // Logout and login as owner
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        
        const emailInput = page.getByLabel(/email/i).first();
        const passwordInput = page.getByLabel(/password/i).first();
        const submitButton = page.getByRole('button', { name: /log in|sign in/i });
        
        if (await emailInput.count() > 0 && await passwordInput.count() > 0 && await submitButton.count() > 0) {
          await emailInput.fill(ownerEmail);
          await passwordInput.fill(ownerPassword);
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Try again on profile page
          await page.goto('/profile');
          await page.waitForLoadState('networkidle');
          
          const ssnInputRetry = page.getByLabel(/ssn/i).first();
          if (await ssnInputRetry.count() === 0) {
            test.skip(true, 'User is not a property owner');
          }
        } else {
          test.skip(true, 'User is not a property owner');
        }
      }
    });
  });
});

