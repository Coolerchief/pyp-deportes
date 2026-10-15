import { expect, type Page, type Route, test } from '@playwright/test';
import { logIn, stubSupabase } from './admin-helpers';

// T4.3: products in the panel with the real supabase-js and a stubbed PostgREST. The catalog
// here is invented; admin_save_product and admin_duplicate_product are answered by the stub.

const CATEGORY = {
  id: 'c0000000-0000-4000-8000-000000000001',
  name: 'Balones',
  parent_id: null,
  size_label: 'Tamaño',
};
const BRAND = { id: 'b0000000-0000-4000-8000-000000000001', name: 'Marca Prueba' };
const SPORT = { id: 'd0000000-0000-4000-8000-000000000001', name: 'Fútbol' };
const STORE = { id: 'e0000000-0000-4000-8000-000000000001', name: 'Coapa' };
const NEW_ID = '0b6f0b6f-0000-4000-8000-0000000000a1';
const COPY_ID = '0b6f0b6f-0000-4000-8000-0000000000a2';

type Saved = Record<string, unknown>;

function productRow(saved: Saved, id: string) {
  return {
    id,
    sku: saved.sku,
    slug: saved.slug,
    name: saved.name,
    brand_id: saved.brandId,
    category_id: saved.categoryId,
    subcategory_id: saved.subcategoryId ?? null,
    audience: saved.audience,
    short_description: saved.shortDescription,
    description: saved.description,
    specs: saved.specs,
    tags: saved.tags,
    option1_name: 'Tamaño',
    option2_name: null,
    color_note: null,
    is_customizable: saved.isCustomizable,
    techniques: saved.techniques,
    min_suggested_qty: saved.minSuggestedQty,
    is_featured: saved.isFeatured,
    status: saved.status,
    published_at: saved.status === 'published' ? '2026-10-14T16:00:00Z' : null,
    updated_at: '2026-10-14T16:00:00Z',
    product_sports: (saved.sportIds as string[]).map((sport_id) => ({ sport_id })),
    product_images: [],
    product_variants: [
      {
        id: 'f0000000-0000-4000-8000-000000000001',
        sku: saved.sku,
        option1_value: null,
        option2_value: null,
        is_default: true,
        is_active: true,
        sort_order: 0,
        variant_prices: [],
        inventory_levels: [],
      },
    ],
  };
}

async function stubCatalog(page: Page) {
  const calls = { saves: [] as Saved[], duplicates: 0, listQueries: [] as string[] };
  let saved: Saved | null = null;
  const json = (route: Route, body: unknown) => route.fulfill({ json: body });
  // maybeSingle(): an object when asked for one ("no rows" otherwise), or a list.
  const one = (route: Route, row: unknown) => {
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    if (!single) return json(route, row ? [row] : []);
    return row
      ? json(route, row)
      : route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'no rows' } });
  };
  await page.route('**/rest/v1/categories?**', (r) => json(r, [CATEGORY]));
  await page.route('**/rest/v1/brands?**', (r) => json(r, [BRAND]));
  await page.route('**/rest/v1/sports?**', (r) => json(r, [SPORT]));
  await page.route('**/rest/v1/stores?**', (r) => json(r, [STORE]));
  await page.route('**/rest/v1/products?**', (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('id')?.replace('eq.', '');
    if (id) {
      const row = saved ? productRow(saved, id) : null;
      if (id === COPY_ID && saved) {
        return one(
          route,
          productRow(
            {
              ...saved,
              name: `${saved.name} (copia)`,
              sku: `${saved.sku}-COPIA`,
              slug: `${saved.slug}-copia`,
              status: 'draft',
            },
            COPY_ID,
          ),
        );
      }
      return one(route, row);
    }
    calls.listQueries.push(url.search);
    const rows = [
      {
        id: '0b6f0b6f-0000-4000-8000-000000000101',
        sku: 'BAL-001',
        name: 'Balón Prueba No. 5',
        status: 'published',
        updated_at: '2026-10-14T16:00:00Z',
        category: { name: 'Balones' },
        product_images: [],
      },
    ];
    return route.fulfill({ json: rows, headers: { 'content-range': '0-0/1' } });
  });
  await page.route('**/rest/v1/rpc/admin_save_product', (route) => {
    saved = route.request().postDataJSON().product as Saved;
    calls.saves.push(saved);
    return json(route, (saved.id as string | undefined) ?? NEW_ID);
  });
  await page.route('**/rest/v1/rpc/admin_duplicate_product', (route) => {
    calls.duplicates += 1;
    return json(route, COPY_ID);
  });
  return calls;
}

test('staff create, publish, archive and duplicate a product', async ({ page }) => {
  await stubSupabase(page, { role: 'editor', full_name: 'Beto Ruiz', is_active: true });
  const calls = await stubCatalog(page);
  await page.goto('/admin/login?next=%2Fadmin%2Fproductos');
  await logIn(page);
  await expect(page).toHaveURL(/\/admin\/productos$/);
  await expect(page.getByRole('heading', { name: 'Productos', level: 1 })).toBeVisible();
  await expect(page.getByText('1 producto', { exact: true })).toBeVisible();
  await expect(page.getByText('SIN FOTO').first()).toBeVisible();

  // Filters go to the URL and to the query.
  await page.getByLabel('Estado').selectOption('draft');
  await expect(page).toHaveURL(/estado=draft/);
  await expect.poll(() => calls.listQueries.at(-1)).toContain('status=eq.draft');

  await page.getByRole('link', { name: 'Nuevo producto' }).click();
  await expect(page.getByRole('heading', { name: 'Nuevo producto' })).toBeVisible();
  await page.getByLabel(/^Nombre/).fill('Balón de Prueba No. 4');
  await expect(page.getByLabel(/^Dirección/)).toHaveValue('balon-de-prueba-no-4');
  await page.getByLabel(/^SKU/).fill('bal-t43');
  await page.getByLabel(/^Categoría/).selectOption(CATEGORY.id);
  await page.getByLabel(/^Marca/).selectOption(BRAND.id);
  await page.getByLabel('Fútbol').check();
  await page.getByRole('button', { name: 'Publicar' }).click();

  await expect(page).toHaveURL(
    new RegExp(`/admin/productos/editar\\?id=${NEW_ID}&aviso=publicado$`),
  );
  await expect(page.getByText(/Producto creado y publicado/)).toBeVisible();
  expect(calls.saves[0]).toMatchObject({
    status: 'published',
    sku: 'BAL-T43',
    slug: 'balon-de-prueba-no-4',
    categoryId: CATEGORY.id,
    brandId: BRAND.id,
    sportIds: [SPORT.id],
  });
  await expect(page.getByLabel(/^SKU/)).toHaveAttribute('readonly', '');

  await page.getByRole('button', { name: 'Archivar' }).click();
  await expect(page.getByText(/Archivado\. Saldrá del sitio/)).toBeVisible();
  expect(calls.saves[1]).toMatchObject({ id: NEW_ID, status: 'archived' });

  await page.getByRole('button', { name: 'Duplicar' }).click();
  await expect(page).toHaveURL(new RegExp(`id=${COPY_ID}&aviso=copia$`));
  await expect(page.getByRole('heading', { name: 'Balón de Prueba No. 4 (copia)' })).toBeVisible();
  await expect(page.getByText(/Esta es una copia en borrador/)).toBeVisible();
  // A copy was never published: its SKU can still change.
  await expect(page.getByLabel(/^SKU/)).not.toHaveAttribute('readonly', '');
  expect(calls.duplicates).toBe(1);
});
