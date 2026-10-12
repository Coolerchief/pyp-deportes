import { expect, test } from '@playwright/test';

test('home page is served from the static build', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

// The build in CI and in deploy.yml has no SITE_INDEXABLE, so it must ship noindex.
test('the site asks search engines not to index it', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toMatch(/User-Agent: \*\nDisallow: \/\n/);
});
