/**
 * e2e/09-public-pages.spec.ts
 * Public pages — gallery, notices, legal pages
 */
import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('gallery page loads with heading and images section', async ({ page }) => {
    await page.goto('/gallery');
    await expect(page.getByText(/Gallery/i).first()).toBeVisible();
  });

  test('notices page loads and shows notice board', async ({ page }) => {
    await page.goto('/notices');
    await expect(page.getByText(/Notice/i).first()).toBeVisible();
  });

  test('background remover tool loads with upload dropzone', async ({ page }) => {
    await page.goto('/tools/bg-remover');
    await expect(page.getByText(/Background Remover|Remove Image Background/i).first()).toBeVisible();
    await expect(page.getByText(/Upload|Drag and drop/i).first()).toBeVisible();
  });

  test('terms and conditions page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByText(/Terms & Conditions|Terms of Service/i).first()).toBeVisible();
  });

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByText(/Privacy Policy/i).first()).toBeVisible();
  });

  test('refund policy page loads', async ({ page }) => {
    await page.goto('/refund');
    await expect(page.getByText(/Refund Policy|Cancellation/i).first()).toBeVisible();
  });

  test('404 for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz');
    // Next.js returns a 404 for unknown routes
    expect(response?.status()).toBe(404);
  });
});
