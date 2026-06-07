import { test, expect, type Page } from '@playwright/test';

test.skip(!process.env.E2E_MEMBER_PSN || !process.env.E2E_MEMBER_PASSWORD, 'E2E member credentials not set');

const memberLogin = async (page: Page) => {
  const psn = process.env.E2E_MEMBER_PSN;
  const password = process.env.E2E_MEMBER_PASSWORD;
  if (!psn || !password) {
    throw new Error('E2E_MEMBER_PSN and E2E_MEMBER_PASSWORD must be set');
  }

  await page.goto('/login');
  await page.getByPlaceholder('Enter your PSN').fill(psn);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard', { timeout: 60_000 });
};

test('loan application next navigation works with validation and handles network interruption', async ({ page }) => {
  await memberLogin(page);
  await page.goto('/apply-loan');

  const next1 = page.getByRole('button', { name: 'Next' }).first();
  await expect(next1).toBeDisabled();

  await page.getByPlaceholder('Enter loan amount').fill('20000');
  await expect(next1).toBeEnabled();
  await next1.click();

  await expect(page.getByPlaceholder("Enter grantor's PSN")).toBeVisible();
  await page.getByPlaceholder("Enter grantor's PSN").fill('UNKNOWN99');
  await page.getByPlaceholder(/Describe the purpose of this loan/i).fill('This is a detailed purpose for the loan request.');

  await page.route('**/members/validate-grantor**', async (route) => {
    await route.abort();
  });

  const next2 = page.getByRole('button', { name: 'Next' }).first();
  await next2.click();

  await expect(page.getByText(/Unable to validate guarantor|check your connection|Invalid guarantor PSN/i)).toBeVisible();

  await page.unroute('**/members/validate-grantor**');

  const guarantorPsn = process.env.E2E_GUARANTOR_PSN;
  if (!guarantorPsn) return;

  await page.getByPlaceholder("Enter grantor's PSN").fill(guarantorPsn);
  await next2.click();
  await expect(page.getByText(/Upload Payslip/i)).toBeVisible();
});
