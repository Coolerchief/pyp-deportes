import { describe, expect, it } from 'vitest';
import {
  commerceForm,
  fetchProduct,
  listProducts,
  productErrorMessage,
  productFiltersQuery,
  readProductFilters,
  searchPattern,
} from './products';

describe('filters in the URL', () => {
  it('reads and writes ?q=&estado=&categoria=&foto=&pagina=', () => {
    const filters = readProductFilters(
      new URLSearchParams('q=balón&estado=published&categoria=c1&foto=sin&pagina=2'),
    );
    expect(filters).toEqual({
      q: 'balón',
      status: 'published',
      categoryId: 'c1',
      withoutPhoto: true,
      page: 2,
    });
    expect(productFiltersQuery(filters)).toBe(
      '?q=bal%C3%B3n&estado=published&categoria=c1&foto=sin&pagina=2',
    );
    expect(readProductFilters(new URLSearchParams('estado=otro&pagina=-3'))).toMatchObject({
      status: '',
      page: 1,
    });
    expect(productFiltersQuery({ page: 1 })).toBe('');
  });

  it('searches like search_text: lowercase, no accents, no wildcards', () => {
    expect(searchPattern(' Balón  Fútbol ')).toBe('%balon%futbol%');
    expect(searchPattern('100%_(x)')).toBe('%100%x%');
    expect(searchPattern('  ')).toBeNull();
  });
});

function fakeQuery(result: { data: unknown; error: unknown; count?: number }) {
  const calls: unknown[][] = [];
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'range', 'ilike', 'eq', 'is']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query);
  }
  query.maybeSingle = async () => result;
  query.then = (resolve: (value: unknown) => void) => resolve(result);
  const client = { from: (table: string) => (calls.push(['from', table]), query) };
  return { client: client as never, calls };
}

describe('listProducts', () => {
  it('filters, orders by name and pages by 50', async () => {
    const { client, calls } = fakeQuery({
      data: [
        {
          id: 'p1',
          sku: 'BAL-001',
          name: 'Balón',
          status: 'draft',
          updated_at: '2026-10-14T16:00:00Z',
          category: { name: 'Balones' },
          product_images: [
            { key_base: 'p/p1/b', sort_order: 1 },
            { key_base: 'p/p1/a', sort_order: 0 },
          ],
        },
      ],
      error: null,
      count: 51,
    });
    const result = await listProducts(client, {
      q: 'balón',
      status: 'draft',
      categoryId: 'c1',
      withoutPhoto: false,
      page: 2,
    });
    expect(result).toEqual({
      total: 51,
      rows: [
        {
          id: 'p1',
          sku: 'BAL-001',
          name: 'Balón',
          status: 'draft',
          categoryName: 'Balones',
          photo: 'p/p1/a',
          updatedAt: '2026-10-14T16:00:00Z',
        },
      ],
    });
    expect(calls.slice(2)).toEqual([
      ['order', 'name'],
      ['order', 'sku'],
      ['range', 50, 99],
      ['ilike', 'search_text', '%balon%'],
      ['eq', 'status', 'draft'],
      ['eq', 'category_id', 'c1'],
    ]);
  });

  it('asks for products without photos with an anti-join', async () => {
    const { client, calls } = fakeQuery({ data: [], error: null, count: 0 });
    await listProducts(client, {
      q: '',
      status: '',
      categoryId: '',
      withoutPhoto: true,
      page: 1,
    });
    expect(String(calls[1]?.[1])).toContain('product_images!left(id)');
    expect(calls.at(-1)).toEqual(['is', 'product_images', null]);
  });
});

describe('fetchProduct', () => {
  it('turns the row into the form and keeps only active variants in order', async () => {
    const { client } = fakeQuery({
      data: {
        id: '0b6f0b6f-0000-4000-8000-000000000001',
        sku: 'UNI-001',
        slug: 'uniforme',
        name: 'Uniforme',
        brand_id: 'b1',
        category_id: 'c1',
        subcategory_id: null,
        audience: 'adulto',
        short_description: 'Corto',
        description: '',
        specs: [{ label: 'Tela', value: 'Dry fit' }, { bad: true }],
        tags: ['liga', 'escolar'],
        option1_name: 'Talla',
        option2_name: null,
        color_note: null,
        is_customizable: true,
        techniques: ['bordado', 'otra'],
        min_suggested_qty: 12,
        is_featured: false,
        status: 'published',
        published_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-14T00:00:00Z',
        product_sports: [{ sport_id: 's1' }],
        product_images: [],
        product_variants: [
          {
            id: 'v2',
            sku: 'UNI-001-M',
            option1_value: 'M',
            option2_value: null,
            is_default: false,
            is_active: true,
            sort_order: 1,
            variant_prices: [
              { min_qty: 12, unit_price_cents: 30000 },
              { min_qty: 1, unit_price_cents: 35000 },
            ],
            inventory_levels: [{ store_id: 't1', quantity: 4 }],
          },
          {
            id: 'v1',
            sku: 'UNI-001-CH',
            option1_value: 'CH',
            option2_value: null,
            is_default: false,
            is_active: true,
            sort_order: 0,
            variant_prices: [],
            inventory_levels: [],
          },
          {
            id: 'v0',
            sku: 'UNI-001',
            option1_value: null,
            option2_value: null,
            is_default: true,
            is_active: false,
            sort_order: 0,
            variant_prices: [],
            inventory_levels: [],
          },
        ],
      },
      error: null,
    });
    const product = (await fetchProduct(client, '0b6f0b6f-0000-4000-8000-000000000001'))!;
    expect(product.form).toMatchObject({
      tags: 'liga, escolar',
      specs: [{ label: 'Tela', value: 'Dry fit' }],
      techniques: ['bordado'],
      minSuggestedQty: '12',
      subcategoryId: '',
      sportIds: ['s1'],
    });
    expect(product.variants.map((v) => v.id)).toEqual(['v1', 'v2']);
    expect(product.photoCount).toBe(0);

    expect(commerceForm(product, [{ id: 't1', name: 'Coapa' }])).toEqual({
      variants: [
        { variantId: 'v1', prices: [], stock: [{ storeId: 't1', quantity: '' }] },
        {
          variantId: 'v2',
          prices: [
            { minQty: '1', price: '350.00' },
            { minQty: '12', price: '300.00' },
          ],
          stock: [{ storeId: 't1', quantity: '4' }],
        },
      ],
    });
  });

  it('says there is no product for a wrong id', async () => {
    const { client } = fakeQuery({ data: null, error: null });
    expect(await fetchProduct(client, 'no-es-un-id')).toBeNull();
    expect(await fetchProduct(client, '0b6f0b6f-0000-4000-8000-000000000009')).toBeNull();
  });
});

describe('productErrorMessage', () => {
  it('puts each database error where it belongs', () => {
    expect(
      productErrorMessage({
        code: '23505',
        message: 'duplicate key value violates unique constraint "products_sku_key"',
      }),
    ).toEqual({ field: 'sku', message: 'Ya existe un producto con ese SKU.' });
    expect(
      productErrorMessage({
        code: '23505',
        message: 'duplicate key value violates unique constraint "products_slug_key"',
      }),
    ).toEqual({ field: 'slug', message: 'Ya existe un producto con esa dirección.' });
    expect(
      productErrorMessage({
        code: '23514',
        message: 'No se puede publicar BAL-001 : necesita al menos una variante activa.',
      }),
    ).toEqual({ message: 'No se puede publicar BAL-001: necesita al menos una variante activa.' });
    expect(productErrorMessage({ code: '22023', message: 'Elige una marca.' })).toEqual({
      message: 'Elige una marca.',
    });
    expect(productErrorMessage({ code: '42501' }).message).toBe(
      'Tu cuenta no puede hacer este cambio.',
    );
    expect(productErrorMessage({ name: 'TypeError', message: 'Failed to fetch' }).message).toMatch(
      /Revisa tu conexión/,
    );
  });
});
