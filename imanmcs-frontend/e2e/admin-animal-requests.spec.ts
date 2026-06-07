import { test, expect, type Page } from '@playwright/test';

const adminLogin = async (page: Page) => {
  const psn = process.env.E2E_ADMIN_PSN;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!psn || !password) {
    throw new Error('E2E_ADMIN_PSN and E2E_ADMIN_PASSWORD must be set');
  }

  await page.goto('/login');
  await page.getByPlaceholder('Enter your PSN').fill(psn);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 60_000 });
};

test('admin animal requests page loads and filters list', async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_PSN || !process.env.E2E_ADMIN_PASSWORD, 'E2E admin credentials not set');
  await adminLogin(page);

  await page.goto('/admin-animal-requests');

  await expect(page.getByRole('heading', { name: 'Animal Acquisition Requests' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Requests' })).toBeVisible();

  await page.getByRole('button', { name: 'Requests' }).click();
  await expect(page.getByLabel('Search')).toBeVisible();
  await page.getByLabel('Status').selectOption('pending');
});

