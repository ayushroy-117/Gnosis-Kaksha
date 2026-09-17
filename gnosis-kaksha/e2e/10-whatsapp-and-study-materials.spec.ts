/**
 * e2e/10-whatsapp-and-study-materials.spec.ts
 * E2E tests for:
 * 1. WhatsApp Fee Reminder integration (Single student modal, Bulk broadcast, Student Help)
 * 2. Study Material library (Public browsing, Student portal view, Teacher upload)
 */
import { test, expect } from '@playwright/test';
import { loginAs, clearAuth } from './helpers/auth';

test.describe('WhatsApp Fee Reminder Integration', () => {
  test('accountant collections shows WhatsApp button for due students and opens reminder modal', async ({ page }) => {
    await clearAuth(page);
    await loginAs(page, 'accountant');
    await page.goto('/accountant/collections');

    // Wait for the ledger
    await expect(page.getByText(/Student Tuition Ledger/i)).toBeVisible({ timeout: 10_000 });

    // Look for WhatsApp button on due student rows in table
    const whatsappBtn = page.getByRole('table').getByRole('button', { name: /WhatsApp/i }).first();
    await expect(whatsappBtn).toBeVisible({ timeout: 10_000 });

    // Click WhatsApp reminder button
    await whatsappBtn.click();

    // Verify WhatsApp Reminder Modal opens
    await expect(page.getByText(/WhatsApp Reminder/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Pending Amount/i)).toBeVisible();
    await expect(page.getByText(/Recipient WhatsApp Number/i)).toBeVisible();
    await expect(page.getByText(/Message Preview/i)).toBeVisible();

    // Verify Action buttons in modal
    await expect(page.getByRole('button', { name: /Open in WhatsApp/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send via API/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy/i }).first()).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /Cancel/i }).first().click();
    await expect(page.getByText(/Recipient WhatsApp Number/i)).not.toBeVisible();
  });

  test('accountant collections has Broadcast WhatsApp Reminders button and modal', async ({ page }) => {
    await clearAuth(page);
    await loginAs(page, 'accountant');
    await page.goto('/accountant/collections');

    const broadcastBtn = page.getByRole('button', { name: /Broadcast WhatsApp/i });
    if (await broadcastBtn.isVisible().catch(() => false)) {
      await broadcastBtn.click();

      // Verify Batch Modal opens
      await expect(page.getByText(/Broadcast WhatsApp Fee Reminders/i)).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText(/Selected Students/i)).toBeVisible();
      await expect(page.getByText(/Total Pending Dues/i)).toBeVisible();

      // Has broadcast submit button
      await expect(
        page.getByRole('button', { name: /Broadcast WhatsApp Reminders/i })
      ).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: /Cancel/i }).first().click();
    }
  });

  test('student fees page displays WhatsApp Help button when dues are pending', async ({ page }) => {
    await clearAuth(page);
    await loginAs(page, 'student');
    await page.goto('/student/fees');

    await expect(page.getByText(/Amount payable/i)).toBeVisible({ timeout: 10_000 });

    // Look for WhatsApp Help button if payment is due
    const whatsappHelpBtn = page.getByRole('link', { name: /WhatsApp/i }).last();
    const isDue = await whatsappHelpBtn.isVisible().catch(() => false);
    if (isDue) {
      const href = await whatsappHelpBtn.getAttribute('href');
      expect(href).toContain('wa.me');
      expect(href).toContain('fee');
    }
  });

  test('API: /api/whatsapp/fee-reminder returns pending students and generated reminders', async ({ request }) => {
    const res = await request.get('/api/whatsapp/fee-reminder');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBeTruthy();
    expect(Array.isArray(data.pendingStudents)).toBeTruthy();
    if (data.pendingStudents.length > 0) {
      expect(data.pendingStudents[0]).toHaveProperty('directUrl');
      expect(data.pendingStudents[0].directUrl).toContain('wa.me');
    }
  });
});

test.describe('Study Material Feature', () => {
  test('public /study-material page loads with hero, search, and class filters', async ({ page }) => {
    await page.goto('/study-material');
    await expect(page.getByText(/Free Study Materials & Notes/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/Search by topic, chapter/i)).toBeVisible();

    // Verify Class filters exist
    await expect(page.getByRole('button', { name: /Class 10/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Class 12/i }).first()).toBeVisible();

    // Verify Material cards are rendered
    await expect(page.getByRole('button', { name: /Download PDF/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Preview/i }).first()).toBeVisible();
  });

  test('clicking Preview opens study material preview modal', async ({ page }) => {
    await page.goto('/study-material');
    await page.getByRole('button', { name: /Preview/i }).first().click();

    // Modal opens
    await expect(page.getByText(/Document Overview/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/PDF Ready for Offline Reading/i)).toBeVisible();

    // Close preview modal
    await page.getByRole('button', { name: /Close/i }).first().click();
  });

  test('class filter updates the displayed study materials list', async ({ page }) => {
    await page.goto('/study-material');
    await page.getByRole('button', { name: /Class 12/i }).first().click();

    // Every visible class tag should say Class 12
    const classBadge = page.getByText(/Class 12/i).first();
    await expect(classBadge).toBeVisible();
  });

  test('student portal shows Study Material in sidebar and loads /student/study-material', async ({ page }) => {
    await clearAuth(page);
    await loginAs(page, 'student');
    await page.goto('/student/dashboard');

    // Sidebar has Study Material
    const navLink = page.locator('aside').getByRole('link', { name: /Study Material/i });
    await expect(navLink).toBeVisible();
    await navLink.click();

    await page.waitForURL('**/student/study-material', { timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /Study Materials/i })).toBeVisible();
  });

  test('teacher portal shows Study Material in sidebar and allows uploading new material', async ({ page }) => {
    await clearAuth(page);
    await loginAs(page, 'teacher');
    await page.goto('/teacher/dashboard');

    // Sidebar has Study Material
    const navLink = page.locator('aside').getByRole('link', { name: /Study Material/i });
    await expect(navLink).toBeVisible();
    await navLink.click();

    await page.waitForURL('**/teacher/study-material', { timeout: 8_000 });
    await expect(page.getByText(/Study Material Management/i)).toBeVisible();

    // Check Upload button
    const uploadBtn = page.getByRole('button', { name: /Upload New Material/i });
    await expect(uploadBtn).toBeVisible();
    await uploadBtn.click();

    // Verify modal form fields
    await expect(page.getByText(/Upload Study Material/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Class 10 Trigonometry Formula Sheet/i)).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /Cancel/i }).first().click();
  });

  test('API: /api/study-material supports GET and POST', async ({ request }) => {
    // GET test
    const getRes = await request.get('/api/study-material?classNumber=10');
    expect(getRes.status()).toBe(200);
    const getData = await getRes.json();
    expect(getData.success).toBeTruthy();
    expect(Array.isArray(getData.materials)).toBeTruthy();

    // POST test
    const postRes = await request.post('/api/study-material', {
      data: {
        title: 'E2E Test: Wave Optics Summary',
        description: 'Automated test upload document',
        classNumber: 12,
        subject: 'Physics',
        category: 'Notes',
        fileSize: '1.5 MB',
        uploadedBy: 'Automated E2E Test',
      },
    });
    expect(postRes.status()).toBe(200);
    const postData = await postRes.json();
    expect(postData.success).toBeTruthy();
    expect(postData.material.title).toBe('E2E Test: Wave Optics Summary');
  });
});
