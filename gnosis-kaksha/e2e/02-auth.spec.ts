/**
 * e2e/02-auth.spec.ts
 * Auth page — all 4 demo role logins + redirect behaviour
 */
import { test, expect } from '@playwright/test';
import { clearAuth } from './helpers/auth';

test.describe('Auth — Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await page.goto('/auth');
  });

  test('auth page renders login form and demo buttons', async ({ page }) => {
    await expect(page.getByText(/1-Click Demo Login/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Student/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Admin/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Accountant/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Teacher/i }).first()).toBeVisible();
  });

  test('student demo login redirects to /student/dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /Student/i }).first().click();
    await page.waitForURL('**/student/dashboard', { timeout: 12_000 });
    await expect(page.url()).toContain('/student/dashboard');
  });

  test('admin demo login redirects to /admin/dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /Admin/i }).first().click();
    await page.waitForURL('**/admin/dashboard', { timeout: 12_000 });
    await expect(page.url()).toContain('/admin/dashboard');
  });

  test('accountant demo login redirects to /accountant/dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /Accountant/i }).first().click();
    await page.waitForURL('**/accountant/dashboard', { timeout: 12_000 });
    await expect(page.url()).toContain('/accountant/dashboard');
  });

  test('teacher demo login redirects to /teacher/dashboard', async ({ page }) => {
    await page.getByRole('button', { name: /Teacher/i }).first().click();
    await page.waitForURL('**/teacher/dashboard', { timeout: 12_000 });
    await expect(page.url()).toContain('/teacher/dashboard');
  });

  test('manual login form shows validation errors on empty submit', async ({ page }) => {
    await page.locator('form').getByRole('button', { name: /Sign In/i }).click();
    await expect(
      page.getByText(/Enter valid email or Registration No/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});
