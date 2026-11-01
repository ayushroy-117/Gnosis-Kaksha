/**
 * Client changes: mobile OTP on the admission form, optional previous-year
 * percentage, corrected receipt (address, helpline, branch, logo, accountant signature).
 */
import { expect, test } from '@playwright/test';
import { randomUtr, submitAdmission, verifyMobileOtp } from './helpers/auth';

const stamp = Date.now().toString(36);

test.describe('mobile OTP', () => {
  test('is sent as soon as a valid number is typed and gates the next step', async ({ page }) => {
    await page.goto('/admission');
    const branch = page.getByLabel('Branch');
    await expect(branch.locator('option').nth(1)).toBeAttached();
    if (!(await branch.inputValue())) await branch.selectOption({ index: 1 });
    await page.getByLabel('Full Name').fill(`OTP Tester ${stamp}`);
    await page.getByLabel('Email Address').fill(`otp.${stamp}@example.com`);
    await page.getByLabel('Date of Birth').fill('2011-05-05');
    await page.getByLabel('Portal Password').fill('Passw0rd!x');
    await page.getByLabel('Confirm Password').fill('Passw0rd!x');

    // No OTP box for an incomplete number.
    await page.getByLabel('Phone / WhatsApp Number').fill('98765');
    await expect(page.getByTestId('otp-box')).toHaveCount(0);

    // Valid number -> OTP is sent automatically.
    await page.getByLabel('Phone / WhatsApp Number').fill('9876543210');
    await expect(page.getByTestId('otp-box')).toBeVisible();
    await expect(page.getByText(/We sent a 6-digit OTP to/)).toBeVisible({ timeout: 15_000 });

    // Can't continue until verified.
    await page.getByRole('button', { name: /Next Step/ }).click();
    await expect(page.getByRole('alert')).toContainText('Verify your mobile number');
    await expect(page.getByLabel('Admission for Class')).toHaveCount(0);

    // Wrong code is rejected.
    await page.getByLabel('Enter OTP').fill('000000');
    await page.getByRole('button', { name: 'Verify OTP' }).click();
    await expect(page.getByRole('alert')).toContainText(/incorrect|expired/i);

    // Right code verifies and unlocks the form.
    await verifyMobileOtp(page);
    await page.getByRole('button', { name: /Next Step/ }).click();
    await expect(page.getByLabel('Admission for Class')).toBeVisible();
  });

  test('changing the number after verifying requires a new OTP', async ({ page }) => {
    await page.goto('/admission');
    await page.getByLabel('Phone / WhatsApp Number').fill('9876543211');
    await verifyMobileOtp(page);
    await page.getByLabel('Phone / WhatsApp Number').fill('9876543212');
    await expect(page.getByText('Mobile number verified')).toHaveCount(0);
    await expect(page.getByLabel('Enter OTP')).toBeVisible();
  });

  test('the API refuses an admission without a verified-mobile proof', async ({ request }) => {
    const res = await request.post('/api/admission', { data: { phone: '9876543213' } });
    expect(res.status()).toBe(400);
    const send = await request.post('/api/otp/send', { data: { phone: 'abc' } });
    expect(send.status()).toBe(400);
    const verify = await request.post('/api/otp/verify', { data: { phone: '9876543214', code: '123456' } });
    expect([400, 429]).toContain(verify.status());
  });
});

test.describe('optional percentage + corrected receipt', () => {
  test('percentage can be left blank; out-of-range is still rejected', async ({ page }) => {
    await page.goto('/admission');
    const branch = page.getByLabel('Branch');
    await expect(branch.locator('option').nth(1)).toBeAttached();
    if (!(await branch.inputValue())) await branch.selectOption({ index: 1 });
    await page.getByLabel('Full Name').fill(`Blank Pct ${stamp}`);
    await page.getByLabel('Email Address').fill(`pct.${stamp}@example.com`);
    await page.getByLabel('Phone / WhatsApp Number').fill('9876543215');
    await verifyMobileOtp(page);
    await page.getByLabel('Date of Birth').fill('2011-05-05');
    await page.getByLabel('Portal Password').fill('Passw0rd!x');
    await page.getByLabel('Confirm Password').fill('Passw0rd!x');
    await page.getByRole('button', { name: /Next Step/ }).click();

    await page.getByLabel('Admission for Class').selectOption('9');
    await page.getByLabel('Current / Previous School Name').fill('Some School');
    const pct = page.getByLabel('Previous Year Score / Percentage (%)');
    await pct.fill('150');
    await page.getByRole('button', { name: /Next Step/ }).click();
    await expect(page.getByText('Percentage must be between 0 and 100')).toBeVisible();

    await pct.fill('');
    await page.getByRole('button', { name: /Next Step/ }).click();
    await expect(page.getByRole('heading', { name: 'Select Enrolled Subjects' })).toBeVisible();

    // The fee sidebar still works with no percentage: no scholarship.
    await page.getByLabel('Mathematics').check();
    await expect(page.getByText('Monthly Tuition:')).toBeVisible();
    await expect(page.getByText('Scholarship Discount:')).toHaveCount(0);
  });

  test('admission with no percentage submits; receipt shows the new header, branch and signature', async ({ page }) => {
    await submitAdmission(page, {
      name: `Receipt Check ${stamp}`,
      email: `receipt.${stamp}@example.com`,
      password: `Passw0rd!${stamp}`,
      utr: randomUtr(),
      phone: '9876543216',
    });

    const sheet = page.locator('.receipt-single-page');
    await expect(sheet).toContainText('Block Road, Ramkrishna Nagar, Sribhumi, Assam - 788166');
    await expect(sheet).toContainText('PH: 8474020124');
    await expect(sheet).not.toContainText(/Cachar|788713|Karimganj/);
    // Branch appears under the academic session, top right.
    await expect(sheet.getByTestId('receipt-branch')).toContainText(/BRANCH: .+/);
    // Accountant's signature replaces the old authorized-signatory block.
    await expect(sheet).toContainText("Accountant's Signature");
    await expect(sheet).not.toContainText('Authorized Signatory');

    // Logo: bigger, and no border around it or its wrapper.
    const logo = sheet.getByRole('img', { name: 'Gnosis Kaksha' });
    const box = await logo.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(72);
    const borders = await logo.evaluate((el) => [el, el.parentElement!].map((n) => getComputedStyle(n).borderTopWidth));
    expect(borders).toEqual(['0px', '0px']);
  });
});
