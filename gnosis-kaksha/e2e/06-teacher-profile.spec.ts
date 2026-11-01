/**
 * Teacher profile + faculty ID card: admin creates a teacher with full details,
 * the teacher sees the new layout/card, the QR page shows live employment status.
 */
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { login, loginAs, requireStaff } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const teacher = {
  name: `Teacher ${stamp}`,
  email: `teacher.${stamp}@example.com`,
  password: `Passw0rd!${stamp}`,
  department: 'English',
  phone: '9876500011',
  father: 'Mr. Test Father',
  address: '12 Faculty Lane, Sribhumi',
  joined: '2024-06-15',
};
let staffCode = '';

test('admin creates a teacher with ID-card details and photo', async ({ page }) => {
  requireStaff('admin');
  await loginAs(page, 'admin');
  await page.goto('/admin/staff');
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Create Account' }) });
  await form.getByLabel('Full Name').first().fill(teacher.name);
  await form.getByLabel('Email Address').fill(teacher.email);
  await form.getByLabel('Branch').selectOption({ index: 1 });
  await form.getByLabel('Department / Subject').fill(teacher.department);
  await form.getByLabel('Contact Number').fill(teacher.phone);
  await form.getByLabel("Father's Name").fill(teacher.father);
  await form.getByLabel('Address').fill(teacher.address);
  await form.getByLabel('Date of Joining').fill(teacher.joined);
  await form.locator('input[type="file"]').setInputFiles(path.join(__dirname, 'fixtures/student-photo.jpg'));
  await expect(form.getByRole('img', { name: /photo/i }).first()).toBeVisible();
  await form.getByLabel('Temporary Password').fill(teacher.password);
  await form.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByText(`Teacher account created for ${teacher.name}`)).toBeVisible();

  // Invalid phone is refused by the API.
  const bad = await page.request.post('/api/admin/accounts', {
    data: { fullName: 'Bad Phone', email: `bad.${stamp}@example.com`, role: 'accountant', password: 'Passw0rd!x', details: { phone: '123' } },
  });
  expect(bad.status()).toBe(400);
});

test('teacher sees Personal / Professional / ID Card layout with their details', async ({ page }) => {
  await login(page, teacher.email, teacher.password);
  await page.goto('/teacher/profile');

  await expect(page.getByTestId('teacher-photo').locator('img')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveText(['Personal Information', 'Professional Information', 'ID Card', 'Salary Information']);

  const personal = page.getByTestId('personal-info');
  await expect(personal).toContainText(teacher.father);
  await expect(personal).toContainText(`+91 ${teacher.phone}`);
  await expect(personal).toContainText(teacher.address);

  await page.getByRole('tab', { name: 'Professional Information' }).click();
  const prof = page.getByTestId('professional-info');
  await expect(prof).toContainText('English Department');
  await expect(prof).toContainText('15 Jun 2024');
  staffCode = (await prof.getByText(/^GK-FAC-[0-9A-F]{6}$/).first().innerText()).trim();

  await page.getByRole('tab', { name: 'Salary Information' }).click();
  await expect(page.getByTestId('salary-placeholder')).toBeVisible();
});

test('faculty ID card: front and back follow the client layout', async ({ page }) => {
  await login(page, teacher.email, teacher.password);
  await page.goto('/teacher/profile');
  await page.getByRole('tab', { name: 'ID Card' }).click();

  const front = page.getByTestId('staff-card-front');
  const back = page.getByTestId('staff-card-back');
  await expect(front.getByRole('img', { name: 'Gnosis Kaksha' })).toBeVisible();
  expect((await front.getByRole('img', { name: 'Gnosis Kaksha' }).boundingBox())!.width).toBeGreaterThanOrEqual(60);
  await expect(front).toContainText('Ramkrishna Nagar, Sribhumi, Assam - 788166');
  await expect(front).not.toContainText(/Karimganj|788713/);
  await expect(front.locator('img[alt]').filter({ hasText: '' }).nth(1)).toBeVisible(); // staff photo
  await expect(front).toContainText('English Department');
  await expect(front).toContainText(teacher.email);
  await expect(front).toContainText(`+91 ${teacher.phone}`);
  await expect(front).toContainText(teacher.father);
  await expect(front).toContainText(teacher.address);
  await expect(front).toContainText('15 Jun 2024');
  await expect(front).toContainText('helpline: 8474020124');
  await expect(front).toContainText('Authorized Signatory');
  expect(await front.getByTestId('staff-barcode').locator('svg rect[fill="#000"]').count()).toBeGreaterThan(20);
  await expect(front.getByTestId('staff-qr').locator('svg')).toBeVisible();

  await expect(back.locator('ol > li')).toHaveCount(7);
  await expect(back).toContainText('must be surrendered to the Administration upon resignation, termination');
  await expect(back).toContainText('Helpline: 8474020124');
  await expect(back).toContainText('Ramkrishna Nagar, Sribhumi, Assam - 788166');
  await expect(back.getByTestId('cardholder-signature')).toHaveText(teacher.name);
  await expect(back).toContainText("Cardholder's Signature");
  const [fb, bb] = [await front.boundingBox(), await back.boundingBox()];
  expect(Math.abs(fb!.height - bb!.height)).toBeLessThan(2);
});

test('QR page shows live status: valid, then NOT VALID after resignation', async ({ page, browser }) => {
  const anon = await browser.newPage();
  await anon.goto(`/verify/staff/${staffCode}`);
  await expect(anon.getByTestId('verify-status')).toContainText('VALID — Currently working');
  await expect(anon.getByText(teacher.name)).toBeVisible();
  await expect(anon.getByTestId('employment-status')).toHaveText('Active');

  await loginAs(page, 'admin');
  await page.goto('/admin/staff');
  const item = page.locator('li').filter({ hasText: teacher.email });
  await item.getByRole('button', { name: /Staff details/ }).click();
  await page.getByLabel('Employment status').selectOption('resigned');
  await page.getByRole('button', { name: 'Save details' }).click();
  await expect(page.getByText(`Details saved for ${teacher.name}`)).toBeVisible();

  await anon.reload();
  await expect(anon.getByTestId('verify-status')).toContainText('NOT VALID — Resigned');
  await expect(anon.getByTestId('verify-status')).toHaveAttribute('data-tone', 'bad');
  await expect(anon.getByTestId('employment-status')).toHaveText('Resigned');
  await anon.close();

  // A resigned teacher can no longer sign in.
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto('/auth');
  await p.getByLabel('Email or Student Reg. No').fill(teacher.email);
  await p.getByLabel('Password').fill(teacher.password);
  await p.getByRole('button', { name: 'Sign In' }).click();
  await expect(p).toHaveURL(/\/auth/);
  await ctx.close();

  // Unknown staff code.
  await page.goto('/verify/staff/GK-FAC-000000');
  await expect(page.getByTestId('verify-status')).toHaveAttribute('data-tone', 'bad');
});
