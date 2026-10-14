import { expect, test } from '@playwright/test';

// T3.2: capturing 20 pieces in 4 sizes takes less than 30 s, with the keyboard only.

test('20 pieces in 4 sizes, keyboard only, in under 30 seconds', async ({ page }) => {
  await page.goto('/producto/uniforme-basquetbol-completo', { waitUntil: 'networkidle' });
  const started = Date.now();

  await page.getByRole('textbox', { name: 'Cantidad talla CH' }).focus();
  for (const pieces of ['5', '5', '5', '5']) {
    await page.keyboard.type(pieces);
    // From a quantity: Tab to its "+", Tab to the next quantity ("−" is disabled at 0).
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  }
  await expect(page.getByText('20 piezas')).toBeVisible();
  const add = page.getByRole('button', { name: 'Agregar a mi cotización' });
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Agregado' })).toHaveText(
    'Agregado a tu cotización: 20 piezas.',
  );

  expect(Date.now() - started).toBeLessThan(30_000);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pyp.quote.v1') ?? '{}'));
  expect(
    saved.state.lines.map((l: { snapshot: { variantLabel: string }; quantity: number }) => [
      l.snapshot.variantLabel,
      l.quantity,
    ]),
  ).toEqual([
    ['CH', 5],
    ['M', 5],
    ['G', 5],
    ['XG', 5],
  ]);
});

test('the total bar stays at the bottom on mobile and lifts the WhatsApp button', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'movil', 'fixed bar on mobile');
  await page.goto('/producto/uniforme-basquetbol-completo', { waitUntil: 'networkidle' });
  const bar = page.getByText('Total', { exact: true }).locator('../..');
  const box = await bar.boundingBox();
  const viewport = page.viewportSize();
  expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(viewport?.height);
  const fab = await page
    .getByRole('link', { name: '¿Dudas? Escríbenos por WhatsApp' })
    .boundingBox();
  expect((fab?.y ?? 0) + (fab?.height ?? 0)).toBeLessThanOrEqual((box?.y ?? 0) - 8);
});
