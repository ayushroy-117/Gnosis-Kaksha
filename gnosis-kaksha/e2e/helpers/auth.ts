/**
 * e2e/helpers/auth.ts — real sign-in through the login form.
 *
 * Staff credentials come from the environment so no secrets live in the repo:
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_ACCOUNTANT_EMAIL / E2E_ACCOUNTANT_PASSWORD
 *   E2E_TEACHER_EMAIL / E2E_TEACHER_PASSWORD
 * Specs that need a missing account are skipped.
 */
import { expect, Page, test } from '@playwright/test';

export type StaffRole = 'admin' | 'accountant' | 'teacher';

export function staffCreds(role: StaffRole) {
  const key = role.toUpperCase();
  const email = process.env[`E2E_${key}_EMAIL`];
  const password = process.env[`E2E_${key}_PASSWORD`];
  return email && password ? { email, password } : null;
}

export function requireStaff(role: StaffRole) {
  const creds = staffCreds(role);
  test.skip(!creds, `set E2E_${role.toUpperCase()}_EMAIL / _PASSWORD to run`);
  return creds!;
}

export async function login(page: Page, identifier: string, password: string) {
  await page.goto('/auth');
  await page.getByLabel('Email or Student Reg. No').fill(identifier);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 20_000 });
}

export async function loginAs(page: Page, role: StaffRole) {
  const creds = requireStaff(role);
  await login(page, creds.email, creds.password);
  await expect(page).toHaveURL(new RegExp(`/${role}/`));
}

/** Random 12-digit UPI transaction ID so reruns never collide. */
export function randomUtr() {
  return `6${Math.floor(Math.random() * 1e11).toString().padStart(11, '0')}`;
}
