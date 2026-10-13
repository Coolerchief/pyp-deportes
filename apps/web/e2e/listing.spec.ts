import { expect, test } from '@playwright/test';

// T2.4: every listing route is generated and carries its first 24 products in the HTML.

const ROUTES = [
  { path: '/catalogo', title: 'Catálogo' },
  { path: '/catalogo/balones', title: 'Balones' },
  { path: '/catalogo/balones/balones-futbol', title: 'Balones de fútbol' },
  { path: '/deporte/futbol', title: 'Fútbol' },
  { path: '/marca/molten', title: 'Molten' },
];

for (const route of ROUTES) {
  test(`${route.path} is a static page with its products`, async ({ request, page }) => {
    // The HTML itself has the cards: no JavaScript or catalog.json needed for the first batch.
    const html = await (await request.get(route.path)).text();
    const cards = html.match(/<article/g)?.length ?? 0;
    expect(cards).toBeGreaterThan(0);
    expect(cards).toBeLessThanOrEqual(24);

    await page.goto(route.path);
    await expect(page.getByRole('heading', { level: 1, name: route.title })).toBeVisible();
    await expect(page).toHaveTitle(new RegExp(`^${route.title} · `));
  });
}

test('/catalogo shows 24 of all the products', async ({ page }) => {
  await page.goto('/catalogo');
  await expect(page.getByRole('article')).toHaveCount(24);
  await expect(page.getByText(/^Mostrando 24 de \d+$/)).toBeVisible();
});

test('a sport page links its two large shortcuts', async ({ page }) => {
  await page.goto('/deporte/futbol');
  await page.getByRole('link', { name: 'Uniformes de fútbol' }).click();
  await expect(page).toHaveURL(/\/catalogo\/uniformes\/uniformes-futbol$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Uniformes de fútbol' })).toBeVisible();
});
