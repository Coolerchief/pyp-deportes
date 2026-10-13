import { expect, test } from '@playwright/test';

// T2.7: one static page per published product, with Product JSON-LD and no price.

test('a card leads to its product page', async ({ page }) => {
  await page.goto('/catalogo/balones/balones-futbol');
  const card = page.getByRole('article').first();
  const name = (await card.getByRole('heading').textContent()) ?? '';
  await card.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/producto\/[a-z0-9-]+$/);
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Especificaciones' })).toBeVisible();
});

test('the full and simple pages differ in their related products', async ({ page }) => {
  await page.goto('/producto/uniforme-basquetbol-completo');
  await expect(page.getByRole('heading', { name: 'Completa el uniforme' })).toBeVisible();
  await page.goto('/producto/balon-soccer-cruzeiro');
  await expect(page.getByRole('heading', { name: 'También te puede interesar' })).toBeVisible();
});

test('the HTML carries Product JSON-LD without offers', async ({ request, page }) => {
  const html = await (await request.get('/producto/balon-soccer-cruzeiro')).text();
  const match = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
  expect(match).not.toBeNull();
  const data = JSON.parse(match![1]!);
  expect(data).toMatchObject({ '@type': 'Product', sku: 'BAL-002' });
  expect(data).not.toHaveProperty('offers');
  // No price anywhere a visitor can read (the site is a catalog without prices).
  await page.goto('/producto/balon-soccer-cruzeiro');
  await expect(page.getByRole('main')).not.toContainText('$');
});
