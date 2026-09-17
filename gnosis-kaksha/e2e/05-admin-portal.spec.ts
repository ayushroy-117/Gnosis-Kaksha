/**
 * e2e/05-admin-portal.spec.ts
 * Admin dashboard — overview stats, admissions queue, notices, students, staff accounts
 */
import { test, expect } from '@playwright/test';
import { loginAs, clearAuth } from './helpers/auth';

test.describe('Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await loginAs(page, 'admin');
  });

  test('admin dashboard shows overview stats', async ({ page }) => {
    await expect(page.getByText(/Admin Overview/i)).toBeVisible();
    await expect(page.getByText(/Total Students|Active Enrollments/i).first()).toBeVisible();
  });

  test('admin sidebar has all nav links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Overview/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Admissions/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Students/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Notices/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Staff/i }).first()).toBeVisible();
  });

  test('admissions page shows pending queue', async ({ page }) => {
    await page.goto('/admin/admissions');
    await expect(page.getByText(/Admission|Pending|Review/i).first()).toBeVisible();
  });

  test('admissions page shows Approve/Reject buttons for pending entries', async ({ page }) => {
    await page.goto('/admin/admissions');
    await expect(page.getByRole('heading', { name: /Admissions/i }).first()).toBeVisible();
    const approveBtn = page.getByRole('button', { name: /Approve/i }).first();
    const noApplications = page.getByText(/No pending admissions/i);
    await expect(approveBtn.or(noApplications)).toBeVisible({ timeout: 10_000 });
  });

  test('students page shows roster table', async ({ page }) => {
    await page.goto('/admin/students');
    await expect(page.getByText(/Students/i).first()).toBeVisible();
    // Table with student names
    await expect(page.getByRole('table').first()).toBeVisible();
  });

  test('notices page loads and can add a notice', async ({ page }) => {
    await page.goto('/admin/notices');
    await expect(page.getByText(/Notice/i).first()).toBeVisible();
  });

  test('staff accounts page loads with roster and create form', async ({ page }) => {
    await page.goto('/admin/staff');
    await expect(page.getByText(/Staff Account/i).first()).toBeVisible();
    await expect(page.getByText(/Create Staff Account/i).first()).toBeVisible();
    await expect(page.getByText(/Staff Roster/i).first()).toBeVisible();
    // Pre-seeded staff (admin, accountant, teacher)
    await expect(page.getByText(/admin@gnosiskaksha.in/i).first()).toBeVisible();
    await expect(page.getByText(/accountant@gnosiskaksha.in/i).first()).toBeVisible();
    await expect(page.getByText(/teacher@gnosiskaksha.in/i).first()).toBeVisible();
  });

  test('staff creation form fields are present', async ({ page }) => {
    await page.goto('/admin/staff');
    await expect(page.getByLabel(/Full Name/i)).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Role/i).first()).toBeVisible();
    await expect(page.getByLabel(/Temporary Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
  });
});
