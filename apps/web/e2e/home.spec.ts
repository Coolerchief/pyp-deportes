import { expect, test } from '@playwright/test';

// T2.8: Inicio with every section of the design; photos from site_media or their marker.

test('Inicio shows the sections of the design', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: /Tu equipo\s*empieza aquí\./i }),
  ).toBeVisible();
  for (const title of [
    'Entra por tu deporte',
    'Tu nombre. Tu número. Tu equipo.',
    'Destacados',
    '¿Compras para tu liga o escuela?',
    'Equipos estrenando',
    'Categorías',
    'Visítanos en Coapa',
  ]) {
    await expect(page.getByRole('heading', { level: 2, name: title })).toBeAttached();
  }
  // No photos uploaded yet: the cover shows its marker.
  await expect(page.getByText('[FOTO DE PORTADA]')).toBeAttached();
  await expect(page.getByRole('article')).toHaveCount(4);
});

test('the hero and the advisor open WhatsApp to quote', async ({ page }) => {
  await page.goto('/');
  const expected = `https://wa.me/525500000000?text=${encodeURIComponent('Hola, quiero cotizar.')}`;
  await expect(page.getByRole('link', { name: 'Cotiza por WhatsApp' }).first()).toHaveAttribute(
    'href',
    expected,
  );
  await expect(page.getByRole('link', { name: /^Escríbele a / })).toHaveAttribute('href', expected);
});

test('the store says whether it is open and how to get there', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/^(Abierto ahora · cierra|Cerrado · abre) /)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute(
    'href',
    /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/,
  );
  await expect(page.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', /^tel:\+52/);
});
