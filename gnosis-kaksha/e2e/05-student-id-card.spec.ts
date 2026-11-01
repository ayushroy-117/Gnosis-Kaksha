/**
 * Student profile + ID card: new header, signature on the back, new rules,
 * real barcode, working QR / scan flow, photo on the profile.
 * Needs the accountant (to approve the admission) and a teacher (to scan).
 */
import { expect, test } from '@playwright/test';
import { code128B } from '../src/lib/code128';
import { login, loginAs, randomUtr, requireStaff, submitAdmission } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const applicant = {
  name: `IdCard Student ${stamp}`,
  email: `idcard.${stamp}@example.com`,
  password: `Passw0rd!${stamp}`,
  utr: randomUtr(),
  phone: '9876512399',
};
let reg = '';

test('Code 128 encoder produces a well-formed barcode', () => {
  // (value + start + checksum) symbols x 11 modules, plus the 13-module stop.
  for (const v of ['GK-2026-0042', 'A', 'GK-FAC-1A2B3C']) {
    const widths = code128B(v);
    expect(widths.reduce((a, b) => a + b, 0)).toBe((v.length + 2) * 11 + 13);
    expect(widths.length).toBe((v.length + 2) * 6 + 7); // 6 bars/spaces per symbol, 7 in the stop
  }
  expect(() => code128B('é')).toThrow();
});

test('applicant submits and the accountant approves', async ({ page }) => {
  requireStaff('accountant');
  requireStaff('teacher');
  await submitAdmission(page, applicant);
  reg = (await page.getByText(/Registration:/).first().locator('span').first().innerText()).trim();
  expect(reg).toMatch(/\S+/);

  await page.context().clearCookies();
  await loginAs(page, 'accountant');
  await page.goto('/accountant/collections');
  const row = page.getByRole('row').filter({ hasText: applicant.name });
  page.once('dialog', (d) => d.accept());
  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText(/Receipt No:\s*RCPT-\d{4}-\d{4}/)).toBeVisible({ timeout: 20_000 });
});

test('student profile: photo shows, card front/back follow the new design', async ({ page }) => {
  await login(page, applicant.email, applicant.password);
  await page.goto('/student/profile');

  // Photo given at admission appears on the profile (not blank) and there is no re-upload for students.
  await expect(page.getByTestId('profile-photo').locator('img')).toBeVisible();
  await expect(page.getByText('Photo & Signature')).toHaveCount(0);

  const front = page.getByTestId('id-card-front');
  const back = page.getByTestId('id-card-back');
  await expect(front).toContainText('GNOSIS KAKSHA');
  await expect(front).toContainText('A PLACE FOR EXCELLENCE'.replace(/ /g, ' '), { ignoreCase: true });
  await expect(front).toContainText('Ramkrishna Nagar, Sribhumi, Assam - 788166');
  await expect(front).toContainText('helpline: 8474020124');
  // No "GK" watermark text, the logo replaces it.
  await expect(front.getByText('GK', { exact: true })).toHaveCount(0);
  await expect(front.getByRole('img', { name: 'Gnosis Kaksha' })).toBeVisible();
  const logoBox = await front.getByRole('img', { name: 'Gnosis Kaksha' }).boundingBox();
  expect(logoBox!.width).toBeGreaterThanOrEqual(60);

  // Student signature is on the BACK, not the front.
  await expect(front.getByRole('img', { name: "Student's signature" })).toHaveCount(0);
  await expect(back.getByRole('img', { name: "Student's signature" })).toBeVisible();
  await expect(back).toContainText("Student's Signature");
  await expect(back).toContainText('Validity');

  // New instructions, all 8, no big empty gap: both cards are the same height and the footer sits at the bottom.
  await expect(back.locator('ol > li')).toHaveCount(8);
  await expect(back).toContainText('The card is non-transferable. Impersonation, tampering, or misuse may result in disciplinary action.');
  await expect(back).toContainText('IF FOUND, PLEASE RETURN THIS CARD TO: GNOSIS KAKSHA');
  await expect(back).toContainText('Block Road, Ramkrishna Nagar, Sribhumi, Assam - 788166');
  const [fb, bb] = [await front.boundingBox(), await back.boundingBox()];
  expect(Math.abs(fb!.height - bb!.height)).toBeLessThan(2);

  // Real barcode (many bars) and a QR that points at the verify page.
  const bars = await front.getByTestId('student-barcode').locator('svg rect[fill="#000"]').count();
  expect(bars).toBeGreaterThan(20);
  await expect(front.getByTestId('student-qr').locator('svg')).toBeVisible();
});

test('anyone scanning the QR sees validity; staff see the profile; barcode scan opens it', async ({ page, browser }) => {
  // Public: name + VALID only.
  const anon = await browser.newPage();
  await anon.goto(`/verify/${encodeURIComponent(reg)}`);
  await expect(anon.getByTestId('verify-status')).toContainText('VALID');
  await expect(anon.getByTestId('verify-status')).toHaveAttribute('data-tone', 'ok');
  await expect(anon.getByText(applicant.name)).toBeVisible();
  await expect(anon.getByTestId('verify-staff-details')).toHaveCount(0);
  await expect(anon.getByTestId('verify-photo')).toHaveCount(0);
  await anon.close();

  // Unknown code.
  await page.goto('/verify/GK-DOES-NOT-EXIST');
  await expect(page.getByTestId('verify-status')).toHaveAttribute('data-tone', 'bad');

  // Teacher uses the scanner page: a scanner types the code + Enter.
  await page.context().clearCookies();
  await loginAs(page, 'teacher');
  await page.goto('/scan');
  await expect(page.getByLabel('Scanned code')).toBeFocused();
  await page.getByLabel('Scanned code').pressSequentially(reg);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/verify/${reg.replace(/[-/]/g, '\\$&')}`));
  await expect(page.getByTestId('verify-status')).toContainText('VALID');
  // Teacher sees roster-level details but no fee data.
  await expect(page.getByTestId('verify-staff-details')).toBeVisible();
  await expect(page.getByTestId('verify-staff-details')).not.toContainText('Fee status');
});

test('students cannot open the scanner', async ({ page }) => {
  await login(page, applicant.email, applicant.password);
  await page.goto('/scan');
  await expect(page).toHaveURL(/\/student\/dashboard/);
});
