/**
 * e2e/04-student-portal.spec.ts
 * Student dashboard — all student portal pages
 */
import { test, expect } from '@playwright/test';
import { loginAs, clearAuth } from './helpers/auth';

test.describe('Student Portal', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await loginAs(page, 'student');
  });

  test('student dashboard loads with welcome message', async ({ page }) => {
    await expect(page.getByText(/Student Portal|Welcome|Dashboard/i).first()).toBeVisible();
  });

  test('student sidebar shows all nav items', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Dashboard|Overview/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Fees/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Courses/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Notices/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Profile/i }).first()).toBeVisible();
  });

  test('student fees page loads', async ({ page }) => {
    await page.goto('/student/fees');
    await expect(page.getByText(/Fee|Tuition|Payment/i).first()).toBeVisible();
  });

  test('student courses page loads', async ({ page }) => {
    await page.goto('/student/courses');
    await expect(page.getByText(/Course|Subject|Enroll/i).first()).toBeVisible();
  });

  test('student notices page loads', async ({ page }) => {
    await page.goto('/student/notices');
    await expect(page.getByText(/Notice|Announcement/i).first()).toBeVisible();
  });

  test('student profile page loads', async ({ page }) => {
    await page.goto('/student/profile');
    await expect(page.getByText(/Profile|Name|Email/i).first()).toBeVisible();
  });

  test('sign out button is visible and clickable', async ({ page }) => {
    const signOutBtn = page.getByRole('button', { name: /Sign Out/i }).first();
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();
    await page.waitForURL('**/', { timeout: 8_000 });
    expect(page.url()).not.toContain('/student');
  });
});
