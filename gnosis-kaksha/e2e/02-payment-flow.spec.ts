/**
 * Full loop: applicant registers + pays via UPI -> submits transaction ID ->
 * portal locked -> accountant approves -> student gains access with receipt.
 */
import { expect, test } from '@playwright/test';
import { loginAs, randomUtr, requireStaff } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const applicant = {
  name: `E2E Student ${stamp}`,
  email: `e2e.${stamp}@example.com`,
  password: `E2e!${stamp}pass`,
  utr: randomUtr(),
};

test('applicant submits admission with a UPI transaction ID', async ({ page }) => {
  requireStaff('accountant'); // the rest of the flow needs it; don't create orphans
  await page.goto('/admission');

  await page.getByLabel('Full Name').fill(applicant.name);
  await page.getByLabel('Email Address').fill(applicant.email);
  await page.getByLabel('Phone / WhatsApp Number').fill('9876512345');
  await page.getByLabel('Date of Birth').fill('2011-05-05');
  await page.getByLabel('Portal Password').fill(applicant.password);
  await page.getByLabel('Confirm Password').fill(applicant.password);
  await page.getByRole('button', { name: /Next Step/ }).click();

  await page.getByLabel('Admission for Class').selectOption('9');
  await page.getByLabel('Current / Previous School Name').fill('E2E Test School');
  await page.getByLabel('Previous Year Score / Percentage (%)').fill('82');
  await page.getByRole('button', { name: /Next Step/ }).click();

  await page.getByLabel('Mathematics').check();
  await page.getByLabel('Science').check();
  await page.getByRole('button', { name: /Next Step/ }).click();

  await page.getByLabel('Residential Address').fill('1 Test Lane');
  await page.getByLabel('Town / City').fill('Silchar');
  await page.getByLabel('State').fill('Assam');
  await page.getByLabel('PIN Code').fill('788001');
  await page.getByLabel('Parent / Guardian Name').fill('E2E Parent');
  await page.getByLabel('Parent / Guardian Mobile').fill('9876512346');
  await page.getByRole('button', { name: /Next Step/ }).click();

  await page.getByLabel('Document Type').selectOption('marksheet');
  await page.getByRole('button', { name: /Next Step/ }).click();

  await expect(page.getByRole('heading', { name: 'Admission Fee & UPI Payment' })).toBeVisible();
  await page.getByLabel(/UPI Transaction ID/).fill(applicant.utr);
  for (const box of await page.locator('input[type="checkbox"]').all()) await box.check();
  await page.getByRole('button', { name: /Complete Admission/ }).click();

  await expect(page.getByText('Application Submitted').first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /Enter Student Portal/ }).click();
  await expect(page.getByRole('heading', { name: 'Admission under review' })).toBeVisible({ timeout: 20_000 });

  // Least privilege: a student can't open the accountant area.
  await page.goto('/accountant/collections');
  await expect(page).toHaveURL(/\/student\/dashboard/);
});

test('accountant approves the payment from the queue', async ({ page }) => {
  await loginAs(page, 'accountant');
  await page.goto('/accountant/collections');
  const row = page.getByRole('row').filter({ hasText: applicant.name });
  await expect(row).toContainText(applicant.utr);
  await expect(row).toContainText('New admission');
  page.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText(/Receipt No:\s*RCPT-\d{4}-\d{4}/)).toBeVisible({ timeout: 20_000 });
});

test('student now has access and a receipt', async ({ page }) => {
  await page.goto('/auth');
  await page.getByLabel('Email or Student Reg. No').fill(applicant.email);
  await page.getByLabel('Password').fill(applicant.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Admission under review' })).toHaveCount(0);

  await page.goto('/student/fees');
  await expect(page.getByText('All dues cleared')).toBeVisible();
  await expect(page.getByRole('button', { name: /Receipt/ }).first()).toBeVisible();
});
