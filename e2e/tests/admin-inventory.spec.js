const { test, expect } = require('@playwright/test');

/**
 * Admin inventory flow (basic).
 *
 * This test assumes:
 * - An admin user exists.
 * - Credentials are provided via:
 *   - E2E_ADMIN_EMAIL
 *   - E2E_ADMIN_PASSWORD
 *
 * It verifies that the admin dashboard is reachable and that
 * the inventory sections render.
 */

test.describe('Admin inventory', () => {
  test('admin can reach inventory management views', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL || 'e2e.admin@test.kayak.com';
  const password = process.env.E2E_ADMIN_PASSWORD || 'TestAdmin123!';

    await page.goto('/login');

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in|sign in/i }).click();

    await page.waitForTimeout(1000);

    await page.getByRole('link', { name: /admin/i }).click();

    await expect(page).toHaveURL(/admin/i);

    await expect(page.getByText(/flights/i)).toBeVisible();
    await expect(page.getByText(/hotels/i)).toBeVisible();
    await expect(page.getByText(/cars/i)).toBeVisible();
  });
});


