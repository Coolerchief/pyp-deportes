import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { parseCsv, toImportRows } from '@pyp/shared';
import { logIn, stubSupabase } from './admin-helpers';

// T4.6: importing docs/data/catalogo-inicial.csv from the panel sends admin_import_products the
// same rows, in the same batches, as `pnpm db:import` (T1.5). PostgREST is stubbed.

// Playwright runs from apps/web.
const CSV_PATH = resolve(process.cwd(), '../../docs/data/catalogo-inicial.csv');

test('the initial catalog imports from the panel exactly as with pnpm db:import', async ({
  page,
}) => {
  await stubSupabase(page, { role: 'editor', full_name: 'Beto Ruiz', is_active: true });
  const batches: unknown[][] = [];
  await page.route('**/rest/v1/products?**', (route) =>
    route.fulfill({ json: [{ sku: 'BAL-001' }, { sku: 'BAL-002' }] }),
  );
  await page.route('**/rest/v1/rpc/admin_import_products', (route) => {
    const rows = (route.request().postDataJSON() as { rows: unknown[] }).rows;
    batches.push(rows);
    return route.fulfill({
      json: { created: rows.length, updated: 0, errors: [], warnings: [] },
    });
  });

  await page.goto('/admin/login');
  await logIn(page);
  await page.goto('/admin/productos/importar');
  await expect(page.getByRole('heading', { name: 'Importar productos' })).toBeVisible();

  // The template downloads with every column.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar plantilla' }).click();
  const template = await download;
  expect(template.suggestedFilename()).toBe('plantilla-productos.csv');
  expect(readFileSync((await template.path())!, 'utf8')).toMatch(/^﻿sku,slug,nombre,marca/);

  await page.getByTestId('importar-input').setInputFiles(CSV_PATH);
  await expect(page.getByText('2 · Revisa antes de importar')).toBeVisible();
  await expect(page.getByText('nuevos').locator('xpath=..')).toContainText('54');
  await expect(page.getByText('se actualizan').locator('xpath=..')).toContainText('2');
  await page.getByRole('button', { name: 'Importar 56 productos' }).click();
  await expect(page.getByText(/Importación terminada/)).toBeVisible();

  const expected = toImportRows(parseCsv(readFileSync(CSV_PATH, 'utf8')));
  expect(batches.map((batch) => batch.length)).toEqual([50, 6]);
  expect(batches.flat()).toEqual(expected);
});
