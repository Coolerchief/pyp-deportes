import { expect, test } from '@playwright/test';

// T2.2: the whole navigation works with the keyboard and every menu closes with Escape.

test('mobile menu works with the keyboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'movil', 'mobile header only');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Menú' });
  await toggle.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('navigation', { name: 'Menú' });
  await expect(menu).toBeVisible();

  await menu.getByRole('button', { name: 'Deportes' }).focus();
  await page.keyboard.press('Enter');
  await expect(menu.getByRole('link', { name: 'Fútbol' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'Fútbol' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: 'Menú' })).toBeFocused();
  await expect(page.getByRole('link', { name: '¿Dudas? Escríbenos por WhatsApp' })).toBeVisible();
});

test('mega menu works with the keyboard', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'escritorio', 'desktop header only');
  await page.goto('/');
  const header = page.getByRole('navigation', { name: 'Principal' });
  const trigger = header.getByRole('button', { name: 'Categorías' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const panel = page.getByRole('region', { name: 'Menú del catálogo' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('link', { name: 'Balones' })).toHaveAttribute(
    'href',
    '/catalogo/balones',
  );

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();

  // The footer reads the store from the build data.
  await expect(page.getByRole('contentinfo')).toContainText('Calz. del Hueso 921, local 42');
});
