import { expect, test } from '@playwright/test';
import { loginAs } from './helpers/auth';

test('teacher: sees class tools, not finance', async ({ page }) => {
  await loginAs(page, 'teacher');
  await page.goto('/teacher/students');
  await expect(page.locator('body')).not.toContainText(/scholarship|amount due/i);
  await page.goto('/accountant/collections');
  await expect(page).toHaveURL(/\/teacher\/dashboard/);
  expect((await page.request.get('/api/data/accountant')).status()).toBe(403);
});

test('accountant: cannot manage accounts', async ({ page }) => {
  await loginAs(page, 'accountant');
  await page.goto('/admin/staff');
  await expect(page).toHaveURL(/\/accountant\/dashboard/);
  expect((await page.request.get('/api/admin/accounts')).status()).toBe(403);
});

test('admin: can open every area and sees account permissions', async ({ page }) => {
  await loginAs(page, 'admin');
  for (const path of ['/admin/dashboard', '/accountant/collections', '/accountant/transactions', '/teacher/attendance']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path));
  }
  await page.goto('/admin/staff');
  await expect(page.getByRole('heading', { name: /Accounts & Permissions/ })).toBeVisible();
  await expect(page.getByText('Master Admin', { exact: true })).toBeVisible();
});
