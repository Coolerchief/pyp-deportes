import { expect, test } from '@playwright/test';

test('home page is served from the static build', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
