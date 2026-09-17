/**
 * e2e/helpers/auth.ts
 * Shared auth helpers — uses the app's mock auth (localStorage-based)
 * to simulate logins for each role without needing real Supabase.
 */
import { Page } from '@playwright/test';

export type Role = 'student' | 'admin' | 'accountant' | 'teacher';

const DEMO_EMAILS: Record<Role, string> = {
  student:    'student@gnosiskaksha.in',
  admin:      'admin@gnosiskaksha.in',
  accountant: 'accountant@gnosiskaksha.in',
  teacher:    'teacher@gnosiskaksha.in',
};

/**
 * Log in as a given role by clicking the 1-click demo button
 * on the /auth page, then wait for redirect.
 */
export async function loginAs(page: Page, role: Role) {
  await page.goto('/auth');
  // The demo buttons show the role label as visible text
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  await page.getByRole('button', { name: new RegExp(label, 'i') }).first().click();
  // Wait until we've navigated away from /auth
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 10_000 });
}

/**
 * Inject auth state directly into localStorage (faster than UI login).
 * Useful for tests that just need auth state, not the login flow itself.
 */
export async function injectAuth(page: Page, role: Role) {
  const user = {
    id: `usr-${role}-e2e`,
    email: DEMO_EMAILS[role],
    role,
    fullName: `${role.charAt(0).toUpperCase() + role.slice(1)} E2E`,
  };
  await page.goto('/');
  await page.evaluate((u) => {
    localStorage.setItem('gk_auth_user', JSON.stringify(u));
  }, user);
}

export async function clearAuth(page: Page) {
  if (page.url() === 'about:blank' || !page.url().startsWith('http')) {
    await page.goto('/auth');
  }
  await page.evaluate(() => {
    try {
      localStorage.removeItem('gk_auth_user');
      localStorage.removeItem('gk_institute_store');
    } catch {
      // Ignore security errors if origin is not ready
    }
  });
}
