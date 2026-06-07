import { test, expect } from '@playwright/test';

test('membership application includes PSN field and enforces step validation before moving next', async ({ page }) => {
  await page.goto('/apply-membership');
  await expect(page.getByRole('heading', { name: 'Join IMAN Cooperative' })).toBeVisible();

  await expect(page.locator('#membership-psn')).toBeVisible();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Personal Information')).toBeVisible();

  await page.locator('#membership-psn').fill('MBR001');
  await page.locator('#membership-first-name').fill('Test');
  await page.locator('#membership-last-name').fill('Applicant');
  await page.locator('#membership-email').fill('test-applicant@example.com');
  await page.locator('#membership-phone').fill('08012345678');
  await page.locator('#membership-dob').fill('1990-01-01');
  await page.locator('#membership-gender').selectOption('male');
  await page.locator('#membership-address').fill('123 Street, City');

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Professional Information')).toBeVisible();
});
