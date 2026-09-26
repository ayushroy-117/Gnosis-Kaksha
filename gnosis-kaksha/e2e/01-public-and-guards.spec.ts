import { expect, test } from '@playwright/test';

test.describe('public pages', () => {
  for (const path of ['/', '/notices', '/gallery', '/study-material', '/admission', '/auth']) {
    test(`${path} renders`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(400);
      await expect(page.locator('body')).not.toContainText('Application error');
    });
  }
});

test.describe('server-side guards', () => {
  for (const path of ['/admin/dashboard', '/accountant/collections', '/teacher/attendance', '/student/fees']) {
    test(`${path} redirects signed-out visitors to /auth`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth\?next=/);
    });
  }

  test('a forged localStorage "admin" user gets nothing', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('gk_auth_user', JSON.stringify({ id: 'x', email: 'x@x', role: 'admin' }))
    );
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('protected APIs reject anonymous callers', async ({ request }) => {
    for (const url of ['/api/data/admin', '/api/data/accountant', '/api/admin/accounts', '/api/admin/students']) {
      expect((await request.get(url)).status(), url).toBe(401);
    }
    const res = await request.post('/api/accountant/verify-payment', { data: { transactionId: 'x', action: 'approve' } });
    expect(res.status()).toBe(401);
  });
});
