import { expect, test } from '@playwright/test';

// T3.3: the header counter shows pieces; the added notice has its two exits.

test('adding from the product page opens the notice and counts pieces in the header', async ({
  page,
}) => {
  await page.goto('/producto/uniforme-basquetbol-completo', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Equipo de 12' }).click();
  await page.getByRole('button', { name: 'Agregar a mi cotización' }).click();

  const notice = page.getByRole('dialog', { name: 'Agregado a tu cotización' });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('12 piezas');
  await expect(notice).toContainText('1 producto · 12 piezas');
  await expect(notice.getByRole('link', { name: 'Ver mi cotización' })).toHaveAttribute(
    'href',
    '/cotizacion',
  );
  await expect(notice.getByRole('button', { name: 'Seguir viendo el catálogo' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(notice).toBeHidden();
  await expect(page.getByRole('link', { name: 'Mi cotización, 12 piezas' }).first()).toBeAttached();
});

test('"+ Cotizar" adds one piece and the notice sends back to the listing', async ({ page }) => {
  await page.goto('/catalogo/balones/balones-futbol', { waitUntil: 'networkidle' });
  const quick = page.getByRole('button', { name: /^Cotizar / }).first();
  await quick.click();
  const notice = page.getByRole('dialog', { name: 'Agregado a tu cotización' });
  await expect(notice).toContainText('1 pieza');
  await notice.getByRole('button', { name: 'Seguir viendo el catálogo' }).click();
  await expect(notice).toBeHidden();
  await expect(page).toHaveURL(/\/catalogo\/balones\/balones-futbol$/);
  await expect(page.getByText('En tu cotización · 1 pieza').first()).toBeVisible();
});

test('the mobile quote bar appears with pieces and survives a reload', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'movil', 'QuoteBar is mobile only');
  await page.goto('/catalogo/balones/balones-futbol', { waitUntil: 'networkidle' });
  await expect(page.getByRole('region', { name: 'Mi cotización' })).toBeHidden();
  await page
    .getByRole('button', { name: /^Cotizar / })
    .first()
    .click();
  await page.keyboard.press('Escape');
  const bar = page.getByRole('region', { name: 'Mi cotización' });
  await expect(bar).toContainText('1 producto · 1 pieza');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(bar).toContainText('1 producto · 1 pieza');
  // The floating WhatsApp button rises above the bar.
  const barBox = await bar.boundingBox();
  const fab = await page
    .getByRole('link', { name: '¿Dudas? Escríbenos por WhatsApp' })
    .boundingBox();
  expect((fab?.y ?? 0) + (fab?.height ?? 0)).toBeLessThanOrEqual(barBox?.y ?? 0);
});

test('step 1 lists, edits, removes with undo and continues', async ({ page }) => {
  await page.goto('/producto/uniforme-basquetbol-completo', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Equipo de 12' }).click();
  await page.getByRole('button', { name: 'Agregar a mi cotización' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Ver mi cotización' }).click();

  await expect(page).toHaveURL(/\/cotizacion$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Mi cotización' })).toBeVisible();
  await expect(page.getByText('1 producto · 12 piezas')).toBeVisible();
  const card = page.getByRole('article', { name: 'Uniforme de Básquetbol Completo' });
  await card.getByRole('button', { name: 'Editar cantidades' }).click();
  await card.getByRole('button', { name: 'Sumar una pieza, CH' }).click();
  await expect(page.getByText('1 producto · 13 piezas')).toBeVisible();

  await card.getByRole('button', { name: 'Quitar Uniforme de Básquetbol Completo' }).click();
  await expect(page.getByText('Tu lista está vacía')).toBeVisible();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByText('1 producto · 13 piezas')).toBeVisible();

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(/\/cotizacion\?paso=2$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/cotizacion$/);
});

test('step 2 sums up the missing data with the focus, and accepts a valid form', async ({
  page,
}) => {
  await page.goto('/catalogo/balones/balones-futbol', { waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: /^Cotizar / })
    .first()
    .click();
  await page.getByRole('dialog').getByRole('link', { name: 'Ver mi cotización' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Tus datos' })).toBeVisible();

  const send = page
    .getByRole('button', { name: 'Enviar cotización por WhatsApp' })
    .locator('visible=true');
  await send.click();
  const summary = page.getByRole('alert').filter({ hasText: 'Faltan 4 datos' });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('nombre, WhatsApp, fecha y aviso de privacidad.');

  await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill('Ana López');
  await page.getByRole('textbox', { name: /WhatsApp/ }).fill('5512345678');
  await page.getByRole('button', { name: '1 mes' }).click();
  await page.getByRole('checkbox', { name: /aviso de privacidad/ }).check();
  await expect(page.getByRole('alert').filter({ hasText: 'Faltan' })).toBeHidden();
});
