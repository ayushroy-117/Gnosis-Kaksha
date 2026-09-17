/**
 * e2e/01-homepage.spec.ts
 * Public-facing homepage — hero, nav, features, gallery, teachers, footer, contact form
 */
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  // ── Page load ──────────────────────────────────────────────────────────────

  test('loads with status 200 and correct title', async ({ page }) => {
    const response = await page.request.get('/');
    expect(response.status()).toBe(200);
    await expect(page).toHaveTitle(/Gnosis Kaksha/i);
  });

  test('hero section has "Learn From The Best" heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Learn From The Best/i }).first()
    ).toBeVisible();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test('navbar has Gnosis Kaksha brand text', async ({ page }) => {
    await expect(page.getByText('Gnosis Kaksha').first()).toBeVisible();
  });

  test('navbar links are visible: Home, Gallery, Notices, Admission', async ({ page }) => {
    await expect(page.getByRole('link', { name: /^Home$/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^Gallery$/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^Notices$/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^Admission$/i }).first()).toBeVisible();
  });

  // ── Hero CTA ───────────────────────────────────────────────────────────────

  test('hero section has "Start Admission" CTA button linking to /admission', async ({ page }) => {
    const ctaLink = page.locator('a[href="/admission"]').first();
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toContainText(/Start Admission|Admission/i);
  });

  test('"Start Admission" button navigates to admission page', async ({ page }) => {
    await page.locator('a[href="/admission"]').first().click();
    await page.waitForURL('**/admission', { timeout: 10_000 });
    expect(page.url()).toContain('/admission');
  });

  // ── Features section ───────────────────────────────────────────────────────

  test('features section heading "Why Choose Gnosis Kaksha?" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Why Choose Gnosis Kaksha/i })).toBeVisible();
  });

  test('features section has 4 feature cards', async ({ page }) => {
    // Each feature card has a heading (h3) for the feature title
    const featureHeadings = [
      /Excellence Teaching/i,
      /Quality Learning/i,
      /Periodical Assessment/i,
      /Best Teachers/i,
    ];
    for (const heading of featureHeadings) {
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    }
  });

  // ── Gallery section ────────────────────────────────────────────────────────

  test('gallery section heading "Our Gallery" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Our Gallery/i })).toBeVisible();
  });

  test('gallery section has a "View All Gallery" link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /gallery/i, exact: false }).filter({ hasText: /gallery/i }).last()).toBeVisible();
  });

  // ── Teachers section ───────────────────────────────────────────────────────

  test('teachers section heading "Our Teachers" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Our Teachers/i })).toBeVisible();
  });

  test('teachers section shows teacher names', async ({ page }) => {
    // Teachers are rendered in a useEffect so wait a bit
    await page.waitForTimeout(500);
    await expect(page.getByText(/Ankur Kumar Nath/i).first()).toBeVisible();
  });

  // ── Footer ─────────────────────────────────────────────────────────────────

  test('footer is visible with address and phone', async ({ page }) => {
    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/Ramkrishna Nagar/i).first()).toBeVisible();
    await expect(page.getByText(/8474020124/i).first()).toBeVisible();
  });

  test('footer has email/domain info', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/query\.gnosiskaksha\.in/i).first()).toBeVisible();
  });

  test('footer copyright shows GNOSIS KAKSHA', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/GNOSIS KAKSHA/i).first()).toBeVisible();
  });

  test('footer Quick Links section is visible', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/Quick Links/i).first()).toBeVisible();
  });
});
