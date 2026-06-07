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

test('admin layyah list loads, scrolls, searches, and filters', async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_PSN || !process.env.E2E_ADMIN_PASSWORD, 'E2E admin credentials not set');
  await adminLogin(page);

  await page.goto('/admin-layyah');

  await expect(page.getByPlaceholder('Search by name, email, or phone')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh list' })).toBeVisible();

  const scrollContainer = page.locator('.max-h-\\[70vh\\]');
  await expect(scrollContainer).toBeVisible();

  await scrollContainer.evaluate((el: HTMLElement) => {
    el.scrollTop = el.scrollHeight;
  });

  await page.getByPlaceholder('Search by name, email, or phone').fill('test');
  await expect(page.locator('[aria-live="polite"]')).toContainText('Showing');

  await page.locator('select').first().selectOption('pending');
  await expect(page.locator('[aria-live="polite"]')).toContainText('Showing');
});

test('inline amount edit validates, opens confirm modal, and cancels', async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_PSN || !process.env.E2E_ADMIN_PASSWORD, 'E2E admin credentials not set');
  await adminLogin(page);
  await page.goto('/admin-layyah');

  const listRefresh = page.getByRole('button', { name: 'Refresh list' });
  await expect(listRefresh).toBeVisible();

  const anyEditButton = page.getByLabel('Edit amount').first();
  if ((await anyEditButton.count()) === 0) {
    await expect(page.locator('text=0 total')).toBeVisible();
    return;
  }

  await anyEditButton.click();

  const amountInput = page.locator('input[inputmode="decimal"]').first();
  await amountInput.fill('abc');
  await amountInput.press('Enter');
  await expect(page.locator('text=Only numbers are allowed')).toBeVisible();

  await amountInput.fill('123.456');
  await amountInput.press('Enter');
  await expect(page.locator('text=Use a positive number with up to 2 decimals')).toBeVisible();

  await amountInput.fill('1200');
  await page.getByRole('button', { name: 'Save' }).first().click();

  await expect(page.getByRole('dialog', { name: 'Confirm amount update' })).toBeVisible();
  await expect(page.getByText('Are you sure you want to update this layyah amount?')).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog', { name: 'Confirm amount update' })).toBeHidden();
});
