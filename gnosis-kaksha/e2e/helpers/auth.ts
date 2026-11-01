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

/** Read the dev OTP shown under the mobile field and verify it (mock OTP provider). */
export async function verifyMobileOtp(page: Page) {
  const devCode = page.getByTestId('otp-dev-code');
  await expect(devCode).toBeVisible({ timeout: 15_000 });
  const code = (await devCode.innerText()).match(/\d{6}/)![0];
  await page.getByLabel('Enter OTP').fill(code);
  await page.getByRole('button', { name: 'Verify OTP' }).click();
  await expect(page.getByText('Mobile number verified')).toBeVisible();
}

export interface Applicant {
  name: string;
  email: string;
  password: string;
  utr: string;
  phone?: string;
  /** Leave undefined to skip the optional previous-year percentage. */
  percentage?: string;
}

/**
 * Fill the whole admission form and submit it (needs the photo/signature
 * fixtures). Resolves on the "Application Submitted" screen.
 */
export async function submitAdmission(page: Page, a: Applicant) {
  const path = await import('node:path');
  await page.goto('/admission');
  const branch = page.getByLabel('Branch');
  await expect(branch.locator('option').nth(1)).toBeAttached();
  if (!(await branch.inputValue())) await branch.selectOption({ index: 1 });
  await page.getByLabel('Full Name').fill(a.name);
  await page.getByLabel('Email Address').fill(a.email);
  await page.getByLabel('Phone / WhatsApp Number').fill(a.phone ?? '9876512345');
  await verifyMobileOtp(page);
  await page.getByLabel('Date of Birth').fill('2011-05-05');
  await page.getByLabel('Portal Password').fill(a.password);
  await page.getByLabel('Confirm Password').fill(a.password);
  await page.getByRole('button', { name: /Next Step/ }).click();

  await page.getByLabel('Admission for Class').selectOption('9');
  await page.getByLabel('Current / Previous School Name').fill('E2E Test School');
  if (a.percentage) await page.getByLabel('Previous Year Score / Percentage (%)').fill(a.percentage);
  await page.getByRole('button', { name: /Next Step/ }).click();

  await page.getByLabel('Mathematics').check();
  await page.getByLabel('Science').check();
  await page.getByRole('button', { name: /Next Step/ }).click();

  await page.getByLabel('Residential Address').fill('1 Test Lane');
  await page.getByLabel('Town / City').fill('Sribhumi');
  await page.getByLabel('State').fill('Assam');
  await page.getByLabel('PIN Code').fill('788166');
  await page.getByLabel('Parent / Guardian Name').fill('E2E Parent');
  await page.getByLabel('Parent / Guardian Mobile').fill('9876512346');
  await page.getByRole('button', { name: /Next Step/ }).click();

  await page.getByLabel('Document Type').selectOption('marksheet');
  const files = page.locator('input[type="file"]');
  await files.nth(0).setInputFiles(path.join(__dirname, '../fixtures/student-photo.jpg'));
  await files.nth(1).setInputFiles(path.join(__dirname, '../fixtures/student-signature.png'));
  await expect(page.getByRole('img', { name: 'Student photo' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Student signature' })).toBeVisible();
  await page.getByRole('button', { name: /Next Step/ }).click();

  await expect(page.getByRole('heading', { name: 'Admission Fee & UPI Payment' })).toBeVisible();
  await page.getByLabel(/UPI Transaction ID/).fill(a.utr);
  for (const box of await page.locator('input[type="checkbox"]').all()) await box.check();
  await page.getByRole('button', { name: /Complete Admission/ }).click();
  await expect(page.getByText('Application Submitted').first()).toBeVisible({ timeout: 20_000 });
}
