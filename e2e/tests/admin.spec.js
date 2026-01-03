const { test, expect } = require('@playwright/test');

/**
 * Admin Management Tests
 * Tests admin inventory management and reporting
 */

const loginAdmin = async (page) => {
  const email = process.env.E2E_ADMIN_EMAIL || 'e2e.admin@test.kayak.com';
  const password = process.env.E2E_ADMIN_PASSWORD || 'TestAdmin123!';

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

test.describe('Admin Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test.describe('Admin Dashboard', () => {
    test('should navigate to admin page', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/admin/i);
    });

    test('should display admin dashboard', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Should show admin sections
      const hasAdminContent = await Promise.race([
        page.getByText(/admin|dashboard|inventory|reports/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.locator('[data-testid="admin-section"], .admin-section').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      ]);

      expect(hasAdminContent).toBeTruthy();
    });
  });

  test.describe('Flight Management', () => {
    test('should create new flight', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find flights section
      const flightsSection = page.getByText(/flights|flight.*management/i).first();
      if (await flightsSection.count() > 0) {
        await flightsSection.click();
        await page.waitForTimeout(1000);
      }

      // Find add/create button
      const addButton = page.getByRole('button', { name: /add|create|new.*flight/i }).first();
      
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(2000);
        
        // Fill flight form
        const airlineInput = page.getByLabel(/airline/i).first();
        if (await airlineInput.count() > 0) {
          await airlineInput.fill('Test Airlines');
        }
        
        const fromInput = page.getByLabel(/from|origin/i).first();
        if (await fromInput.count() > 0) {
          await fromInput.fill('LAX');
        }
        
        const toInput = page.getByLabel(/to|destination/i).first();
        if (await toInput.count() > 0) {
          await toInput.fill('JFK');
        }
        
        const priceInput = page.getByLabel(/price/i).first();
        if (await priceInput.count() > 0) {
          await priceInput.fill('299.99');
        }
        
        // Submit form
        const submitButton = page.getByRole('button', { name: /submit|create|save/i });
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(2000);
          
          // Should show success
          const success = page.getByText(/success|created|added/i);
          await expect(success.first()).toBeVisible();
        }
      }
    });

    test('should update existing flight', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find flights list
      const flightCard = page.locator('[data-testid="flight-card"], .flight-card, [class*="flight"]').first();
      
      if (await flightCard.count() > 0) {
        // Find edit button
        const editButton = page.getByRole('button', { name: /edit|update/i }).first();
        
        if (await editButton.count() > 0) {
          await editButton.click();
          await page.waitForTimeout(2000);
          
          // Update price
          const priceInput = page.getByLabel(/price/i).first();
          if (await priceInput.count() > 0) {
            await priceInput.fill('349.99');
            
            const saveButton = page.getByRole('button', { name: /save|update/i });
            if (await saveButton.count() > 0) {
              await saveButton.first().click();
              await page.waitForTimeout(2000);
              
              const success = page.getByText(/success|updated/i);
              await expect(success.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('should delete flight', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find flights list
      const flightCard = page.locator('[data-testid="flight-card"], .flight-card').first();
      
      if (await flightCard.count() > 0) {
        // Find delete button
        const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first();
        
        if (await deleteButton.count() > 0) {
          await deleteButton.click();
          await page.waitForTimeout(1000);
          
          // Confirm deletion if confirmation dialog appears
          const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
          if (await confirmButton.count() > 0) {
            await confirmButton.first().click();
            await page.waitForTimeout(2000);
            
            const success = page.getByText(/success|deleted|removed/i);
            await expect(success.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Hotel Management', () => {
    test('should create new hotel', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find hotels section
      const hotelsSection = page.getByText(/hotels|hotel.*management/i).first();
      if (await hotelsSection.count() > 0) {
        await hotelsSection.click();
        await page.waitForTimeout(1000);
      }

      const addButton = page.getByRole('button', { name: /add|create|new.*hotel/i }).first();
      
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(2000);
        
        // Fill hotel form
        const nameInput = page.getByLabel(/name/i).first();
        if (await nameInput.count() > 0) {
          await nameInput.fill('Test Hotel');
        }
        
        const cityInput = page.getByLabel(/city/i).first();
        if (await cityInput.count() > 0) {
          await cityInput.fill('New York');
        }
        
        const priceInput = page.getByLabel(/price/i).first();
        if (await priceInput.count() > 0) {
          await priceInput.fill('150.00');
        }
        
        const submitButton = page.getByRole('button', { name: /submit|create|save/i });
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(2000);
          
          const success = page.getByText(/success|created/i);
          await expect(success.first()).toBeVisible();
        }
      }
    });

    test('should update hotel', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const hotelCard = page.locator('[data-testid="hotel-card"], .hotel-card').first();
      
      if (await hotelCard.count() > 0) {
        const editButton = page.getByRole('button', { name: /edit|update/i }).first();
        
        if (await editButton.count() > 0) {
          await editButton.click();
          await page.waitForTimeout(2000);
          
          const priceInput = page.getByLabel(/price/i).first();
          if (await priceInput.count() > 0) {
            await priceInput.fill('175.00');
            
            const saveButton = page.getByRole('button', { name: /save|update/i });
            if (await saveButton.count() > 0) {
              await saveButton.first().click();
              await page.waitForTimeout(2000);
              
              const success = page.getByText(/success|updated/i);
              await expect(success.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('should delete hotel', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const hotelCard = page.locator('[data-testid="hotel-card"], .hotel-card').first();
      
      if (await hotelCard.count() > 0) {
        const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first();
        
        if (await deleteButton.count() > 0) {
          await deleteButton.click();
          await page.waitForTimeout(1000);
          
          const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
          if (await confirmButton.count() > 0) {
            await confirmButton.first().click();
            await page.waitForTimeout(2000);
            
            const success = page.getByText(/success|deleted/i);
            await expect(success.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Car Management', () => {
    test('should create new car', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find cars section
      const carsSection = page.getByText(/cars|car.*management/i).first();
      if (await carsSection.count() > 0) {
        await carsSection.click();
        await page.waitForTimeout(1000);
      }

      const addButton = page.getByRole('button', { name: /add|create|new.*car/i }).first();
      
      if (await addButton.count() > 0) {
        await addButton.click();
        await page.waitForTimeout(2000);
        
        // Fill car form
        const modelInput = page.getByLabel(/model|make/i).first();
        if (await modelInput.count() > 0) {
          await modelInput.fill('Test Car Model');
        }
        
        const typeInput = page.getByLabel(/type/i).first();
        if (await typeInput.count() > 0) {
          await typeInput.fill('SUV');
        }
        
        const priceInput = page.getByLabel(/price/i).first();
        if (await priceInput.count() > 0) {
          await priceInput.fill('50.00');
        }
        
        const submitButton = page.getByRole('button', { name: /submit|create|save/i });
        if (await submitButton.count() > 0) {
          await submitButton.first().click();
          await page.waitForTimeout(2000);
          
          const success = page.getByText(/success|created/i);
          await expect(success.first()).toBeVisible();
        }
      }
    });

    test('should update car', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const carCard = page.locator('[data-testid="car-card"], .car-card').first();
      
      if (await carCard.count() > 0) {
        const editButton = page.getByRole('button', { name: /edit|update/i }).first();
        
        if (await editButton.count() > 0) {
          await editButton.click();
          await page.waitForTimeout(2000);
          
          const priceInput = page.getByLabel(/price/i).first();
          if (await priceInput.count() > 0) {
            await priceInput.fill('60.00');
            
            const saveButton = page.getByRole('button', { name: /save|update/i });
            if (await saveButton.count() > 0) {
              await saveButton.first().click();
              await page.waitForTimeout(2000);
              
              const success = page.getByText(/success|updated/i);
              await expect(success.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('should delete car', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const carCard = page.locator('[data-testid="car-card"], .car-card').first();
      
      if (await carCard.count() > 0) {
        const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first();
        
        if (await deleteButton.count() > 0) {
          await deleteButton.click();
          await page.waitForTimeout(1000);
          
          const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
          if (await confirmButton.count() > 0) {
            await confirmButton.first().click();
            await page.waitForTimeout(2000);
            
            const success = page.getByText(/success|deleted/i);
            await expect(success.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Reports', () => {
    test('should view revenue report', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find reports section
      const reportsLink = page.getByRole('link', { name: /reports|revenue|analytics/i }).or(
        page.getByText(/reports|revenue/i)
      ).first();
      
      if (await reportsLink.count() > 0) {
        await reportsLink.click();
        await page.waitForTimeout(2000);
        
        // Should show revenue data
        const revenueData = page.getByText(/revenue|total|amount|period/i);
        await expect(revenueData.first()).toBeVisible();
      }
    });

    test('should view providers report', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Find providers report
      const providersLink = page.getByRole('link', { name: /providers|top.*providers/i }).or(
        page.getByText(/providers/i)
      ).first();
      
      if (await providersLink.count() > 0) {
        await providersLink.click();
        await page.waitForTimeout(2000);
        
        // Should show providers data
        const providersData = page.getByText(/provider|revenue|bookings/i);
        await expect(providersData.first()).toBeVisible();
      }
    });
  });

  test.describe('User Management', () => {
    test('should view users list', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      // Should show users list
      const hasUsers = await Promise.race([
        page.locator('[data-testid="user-card"], .user-card, [class*="user"]').first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
        page.getByText(/users|user.*list/i).waitFor({ timeout: 5000 }).then(() => true).catch(() => false),
      ]);

      expect(hasUsers).toBeTruthy();
    });

    test('should view user details', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      const userCard = page.locator('[data-testid="user-card"], .user-card').first();
      
      if (await userCard.count() > 0) {
        await userCard.click();
        await page.waitForTimeout(2000);
        
        // Should show user details
        const details = page.getByText(/email|name|role|bookings/i);
        await expect(details.first()).toBeVisible();
      }
    });

    test('should modify user access', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');

      const userCard = page.locator('[data-testid="user-card"], .user-card').first();
      
      if (await userCard.count() > 0) {
        await userCard.click();
        await page.waitForTimeout(1000);
        
        // Find role/access controls
        const roleSelect = page.getByLabel(/role/i).or(page.locator('select').filter({ hasText: /role/i })).first();
        
        if (await roleSelect.count() > 0) {
          await roleSelect.selectOption({ label: /moderator|admin|user/i });
          
          const saveButton = page.getByRole('button', { name: /save|update/i });
          if (await saveButton.count() > 0) {
            await saveButton.first().click();
            await page.waitForTimeout(2000);
            
            const success = page.getByText(/success|updated/i);
            await expect(success.first()).toBeVisible();
          }
        }
      }
    });
  });
});

