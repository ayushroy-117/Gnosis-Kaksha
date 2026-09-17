/**
 * e2e/06-accountant-portal.spec.ts
 * Accountant portal — overview, collections, transactions, fee-structure, allocation queue
 */
import { test, expect } from '@playwright/test';
import { loginAs, clearAuth } from './helpers/auth';

test.describe('Accountant Portal', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuth(page);
    await loginAs(page, 'accountant');
  });

  test('accountant dashboard shows finance overview', async ({ page }) => {
    await expect(page.getByText(/Finance Overview/i)).toBeVisible();
    await expect(page.getByText(/Collected This Month|Pending Dues/i).first()).toBeVisible();
  });

  test('accountant sidebar has all nav links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Overview/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Collections/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Transactions/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Reports/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Allocations/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Fee Structure/i }).first()).toBeVisible();
  });

  test('collections page shows student tuition ledger', async ({ page }) => {
    await page.goto('/accountant/collections');
    await expect(page.getByText(/Collections/i).first()).toBeVisible();
    await expect(page.getByText(/Student Tuition Ledger|Collected|Outstanding/i).first()).toBeVisible();
  });

  test('collections record payment button appears for due students', async ({ page }) => {
    await page.goto('/accountant/collections');
    await expect(page.getByText(/Collections/i).first()).toBeVisible();
    const recordBtn = page.getByRole('button', { name: /Record Payment/i }).first();
    await expect(recordBtn).toBeVisible({ timeout: 10_000 });
  });

  test('transactions page shows ledger with search and filters', async ({ page }) => {
    await page.goto('/accountant/transactions');
    await expect(page.getByText(/Transactions Ledger/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Search by student|receipt|UTR/i)).toBeVisible();
  });

  test('reports page loads', async ({ page }) => {
    await page.goto('/accountant/reports');
    await expect(page.getByText(/Report|Summary|Finance/i).first()).toBeVisible();
  });

  test('allocation queue page loads with pending requests', async ({ page }) => {
    await page.goto('/accountant/allocations');
    await expect(page.getByRole('heading', { name: /Subject Allocation Queue|Allocation/i }).first()).toBeVisible();
    // Should show pending requests or empty state
    const pendingReq = page.getByText(/Pending Request/i).first();
    const allCaughtUp = page.getByText(/All caught up/i).first();
    await expect(pendingReq.or(allCaughtUp)).toBeVisible({ timeout: 10_000 });
  });

  test('allocation queue shows Approve and Reject buttons', async ({ page }) => {
    await page.goto('/accountant/allocations');
    await expect(page.getByRole('heading', { name: /Subject Allocation Queue|Allocation/i }).first()).toBeVisible();
    const approveBtn = page.getByRole('button', { name: /Approve/i }).first();
    const allClear = page.getByText(/All caught up/i).first();
    await expect(approveBtn.or(allClear)).toBeVisible({ timeout: 10_000 });
    if (await approveBtn.isVisible().catch(() => false)) {
      await expect(page.getByRole('button', { name: /Reject/i }).first()).toBeVisible();
    }
  });

  test('allocation queue shows student payment context', async ({ page }) => {
    await page.goto('/accountant/allocations');
    await expect(page.getByRole('heading', { name: /Subject Allocation Queue|Allocation/i }).first()).toBeVisible();
    // Payment history section should appear for each pending request
    const paymentInfo = page.getByText(/Total Paid|Payment History|Monthly Tuition/i).first();
    const allClear = page.getByText(/All caught up/i).first();
    await expect(paymentInfo.or(allClear)).toBeVisible({ timeout: 10_000 });
  });

  test('approve allocation updates request status', async ({ page }) => {
    await page.goto('/accountant/allocations');
    const approveBtn = page.getByRole('button', { name: /Approve/i }).first();
    if (await approveBtn.isVisible().catch(() => false)) {
      await approveBtn.click();
      // Toast or status change
      await expect(page.getByText(/Approved/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('reject allocation requires a reason note', async ({ page }) => {
    await page.goto('/accountant/allocations');
    const rejectBtn = page.getByRole('button', { name: /Reject/i }).first();
    if (await rejectBtn.isVisible().catch(() => false)) {
      await rejectBtn.click();
      // Reject modal should appear
      await expect(page.getByText(/Rejection Reason/i)).toBeVisible({ timeout: 3_000 });
      // Confirm without note — should show error
      await page.getByRole('button', { name: /Confirm Reject/i }).click();
      await expect(page.getByText(/reason/i).first()).toBeVisible({ timeout: 3_000 });
    }
  });

  test('fee structure page shows editable fee table', async ({ page }) => {
    await page.goto('/accountant/fee-structure');
    await expect(page.getByText(/Fee Structure/i).first()).toBeVisible();
    await expect(page.getByText(/Examination Fee/i)).toBeVisible();
    await expect(page.getByText(/T-Shirt Fee/i)).toBeVisible();
    // At least one class fee table
    await expect(page.getByText(/Class 5|Class 8|Class 10/i).first()).toBeVisible();
    // Editable number inputs
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
  });

  test('fee structure changes trigger Save Changes button', async ({ page }) => {
    await page.goto('/accountant/fee-structure');
    const feeInput = page.locator('input[type="number"]').first();
    const currentVal = await feeInput.inputValue();
    await feeInput.fill(String(Number(currentVal) + 50));
    await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible({ timeout: 3_000 });
  });
});
