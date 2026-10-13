import { expect, test } from '@playwright/test';

// T2.5: filters, order and "Cargar más" run in the browser from catalog.json, and the URL keeps
// the view so sharing it reproduces it.

test('sharing a filtered URL reproduces the view', async ({ page }) => {
  await page.goto('/deporte/futbol?categoria=balones&orden=nombre');
  const cards = page.getByRole('article');
  // The static batch shows first, then the skeletons while catalog.json loads, then the result.
  await expect
    .poll(async () => {
      const count = await cards.count();
      return count > 0 && count < 24;
    })
    .toBe(true);
  const names = await cards.getByRole('heading').allTextContents();
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  await expect(
    page.getByRole('navigation', { name: 'Categorías del listado' }).getByRole('button', {
      name: 'Balones',
    }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('the desktop panel filters at once and writes the URL', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'escritorio', 'side panel on desktop');
  // Interact once React has taken over the static HTML.
  await page.goto('/catalogo', { waitUntil: 'networkidle' });
  const panel = page.getByRole('complementary', { name: 'Filtros' });
  await panel.getByRole('checkbox', { name: /Solo personalizables/ }).check();
  await expect(page).toHaveURL(/\/catalogo\?personalizable=1$/);
  await expect(page.getByRole('list', { name: 'Filtros activos' })).toContainText('Personalizable');
  for (const badge of await page.getByRole('article').all()) {
    await expect(badge).toContainText('Personalizable');
  }

  // Sorting with the keyboard.
  await page.getByRole('button', { name: /Ordenar por/ }).click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/personalizable=1&orden=nombre$/);
});

test('the mobile sheet applies on "Ver n productos" and "Cargar más" adds 24', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'movil', 'bottom sheet on mobile');
  await page.goto('/catalogo', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Cargar más' }).click();
  await expect(page.getByRole('article')).toHaveCount(48);

  await page.getByRole('button', { name: 'Filtrar' }).click();
  const sheet = page.getByRole('dialog', { name: 'Filtrar' });
  await sheet.getByRole('checkbox', { name: /Solo personalizables/ }).check();
  const apply = sheet.getByRole('button', { name: /^Ver \d+ productos?$/ });
  const label = await apply.textContent();
  await apply.click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\?personalizable=1$/);
  const shown = Number(label?.match(/\d+/)?.[0]);
  await expect(page.getByRole('article')).toHaveCount(Math.min(shown, 24));
  await expect(page.getByRole('button', { name: 'Filtrar (1)' })).toBeVisible();
});

test('filters with no results offer "Limpiar filtros"', async ({ page }) => {
  await page.goto('/catalogo?categoria=balones&para=infantil&personalizable=1');
  await expect(page.getByText('Ningún producto con estos filtros')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole('article')).toHaveCount(24);
});
