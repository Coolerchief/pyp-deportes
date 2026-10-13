import { expect, test } from '@playwright/test';

// T2.6: "futbol" finds "Fútbol"; "valon" suggests "balón".

test('"futbol" finds products named "Fútbol"', async ({ page }) => {
  await page.goto('/buscar?q=futbol');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Resultados para “futbol”' }),
  ).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'Fútbol' }).first()).toBeVisible();
});

test('"valon" suggests "balón" and the suggestion searches it', async ({ page }) => {
  await page.goto('/buscar?q=valon');
  const suggestion = page.getByRole('link', { name: 'balón', exact: true });
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(page).toHaveURL(/\/buscar\?q=bal%C3%B3n$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Resultados para “balón”' }),
  ).toBeVisible();
});

test('a search without results offers sports, categories and WhatsApp', async ({ page }) => {
  await page.goto('/buscar?q=patineta');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sin resultados para “patineta”' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'O por categoría' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pregunta por WhatsApp' })).toHaveAttribute(
    'href',
    /patineta/,
  );
});

test('typing in the header suggests and Enter opens the results', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  if (testInfo.project.name === 'movil') {
    await page.getByRole('button', { name: 'Buscar' }).first().click();
  }
  const field = page.getByRole('combobox', { name: 'Busca en el catálogo' }).first();
  await field.click();
  await field.fill('molten');
  await expect(page.getByRole('listbox', { name: 'Sugerencias' }).first()).toBeVisible();
  await expect(page.getByRole('option').first()).toContainText('Molten');
  await field.press('Enter');
  await expect(page).toHaveURL(/\/buscar\?q=molten$/);
  await expect(page.getByRole('article').first()).toContainText('Molten');
});
