/**
 * Full loop: applicant registers + pays via UPI -> submits transaction ID ->
 * portal locked -> accountant approves -> student gains access with receipt.
 */
import { expect, test } from '@playwright/test';
import { loginAs, randomUtr, requireStaff, submitAdmission } from './helpers/auth';

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
  await submitAdmission(page, { ...applicant, percentage: '82' });
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
