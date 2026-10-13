import { describe, expect, it } from 'vitest';
import {
  BuildDataError,
  buildCatalog,
  buildSettings,
  catalogMeta,
  type RawBuildRows,
  validateBuildRows,
} from './build-data';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const NOW = '2026-10-11T12:00:00.000Z';

function rawRows(): RawBuildRows {
  return {
    public_products: [
      {
        id: id(1),
        sku: 'UNI-001',
        slug: 'uniforme-futbol',
        name: 'Uniforme de Fútbol',
        brand_id: id(10),
        category_id: id(20),
        subcategory_id: id(21),
        audience: 'unisex',
        short_description: '',
        description: '',
        specs: [{ label: 'Tela', value: 'Dry-fit' }],
        tags: [],
        option1_name: 'Talla',
        option2_name: null,
        color_note: 'A elegir',
        is_customizable: true,
        techniques: ['sublimacion'],
        min_suggested_qty: null,
        is_featured: true,
        sort_order: 0,
        status: 'published',
        published_at: '2026-10-11T21:05:33.571111+00:00',
        legacy_url: null,
      },
    ],
    public_product_variants: [
      {
        id: id(3),
        product_id: id(1),
        sku: 'UNI-001-M',
        option1_value: 'M',
        option2_value: null,
        is_default: false,
        sort_order: 2,
      },
      {
        id: id(2),
        product_id: id(1),
        sku: 'UNI-001-CH',
        option1_value: 'CH',
        option2_value: null,
        is_default: false,
        sort_order: 1,
      },
    ],
    public_product_images: [
      {
        id: id(5),
        product_id: id(1),
        variant_id: id(2),
        key_base: 'p/1/b',
        alt: 'Variante',
        width: 800,
        height: 1000,
        sort_order: 0,
      },
      {
        id: id(4),
        product_id: id(1),
        variant_id: null,
        key_base: 'p/1/a',
        alt: 'Frente',
        width: 800,
        height: 1000,
        sort_order: 1,
      },
    ],
    public_product_sports: [{ product_id: id(1), sport_id: id(30) }],
    public_sports: [{ id: id(30), slug: 'futbol', name: 'Fútbol', sort_order: 1 }],
    public_categories: [
      {
        id: id(20),
        parent_id: null,
        slug: 'uniformes',
        name: 'Uniformes',
        size_label: 'Talla',
        sort_order: 1,
      },
      {
        id: id(21),
        parent_id: id(20),
        slug: 'uniformes-futbol',
        name: 'Uniformes de fútbol',
        size_label: 'Talla',
        sort_order: 1,
      },
    ],
    public_brands: [
      { id: id(10), slug: 'pyp', name: 'P&P', logo_key: null, is_own_brand: true, sort_order: 1 },
    ],
    public_stores: [
      {
        id: id(40),
        slug: 'coapa',
        name: 'P&P Deportes Coapa',
        street: 'Calz. del Hueso 921, local 42',
        neighborhood: 'Granjas Coapa',
        borough: 'Tlalpan',
        postal_code: '14330',
        city: 'Ciudad de México',
        lat: 19.3005,
        lng: -99.127,
        phone: '5565822426',
        email: null,
        hours: [{ days: [1, 2, 3, 4, 5], open: '10:00', close: '19:00' }],
        directions: '[REFERENCIAS]',
        sort_order: 1,
      },
    ],
    public_settings: [
      { key: 'whatsapp_sales_number', value: '5500000000' },
      { key: 'site_name', value: 'P&P Deportes Coapa' },
      { key: 'social', value: { instagram: 'pyp_coapa' } },
      {
        key: 'flags',
        value: {
          show_prices: false,
          enable_checkout: false,
          enable_shipping: false,
          enable_stock: false,
        },
      },
      { key: 'ga_measurement_id', value: null },
    ],
    public_site_texts: [
      { key: 'advisor', value: { name: '[Ana]', role: 'Asesora', quote: 'Cuéntame.' } },
      { key: 'uniforms_faq', value: [{ question: '¿Mínimo?', answer: '[PEDIDO MÍNIMO]' }] },
      { key: 'store_history', value: { text: '[HISTORIA]' } },
      {
        key: 'privacy_notice',
        value: { version: '2026-10', updatedAt: '[FECHA]', sections: [{ title: 'A', body: 'B' }] },
      },
    ],
    public_site_media: [
      ...[
        'home_hero',
        'uniforms_hero',
        'technique_sublimacion',
        'technique_vinil',
        'technique_bordado',
        'store_front',
        'store_workshop',
      ].map((slot) => ({ slot, key_base: null, alt: '', width: null, height: null })),
      { slot: 'advisor', key_base: 's/advisor/x', alt: 'Ana', width: 600, height: 600 },
    ],
  };
}

describe('catalogMeta', () => {
  const meta = (
    option1Name: string,
    variants: [string | null, string | null][],
    option2Name: string | null = null,
    colorNote: string | null = null,
  ) =>
    catalogMeta(
      { option1Name, option2Name, colorNote },
      variants.map(([o1, o2]) => ({ o1, o2 })),
    );

  it('writes the summaries of the design', () => {
    const tallas = 'CH M G XG 2XL 4 6 8 10 12'.split(' ');
    expect(
      meta(
        'Talla',
        tallas.map((t) => [t, null]),
        null,
        'A elegir',
      ),
    ).toBe('10 tallas · colores a elegir');
    expect(
      meta(
        'Tamaño',
        ['3', '4', '5'].flatMap((t) =>
          ['Rojo', 'Azul', 'Verde', 'Negro'].map((c) => [t, c] as [string, string]),
        ),
        'Color',
      ),
    ).toBe('3 tamaños · 4 colores');
    expect(
      meta(
        'Peso',
        [
          ['10oz', 'Rojo'],
          ['12oz', 'Rojo'],
          ['14oz', 'Azul'],
          ['14oz', 'Negro'],
        ],
        'Color',
      ),
    ).toBe('3 pesos · 3 colores');
    expect(
      meta('Talla', [
        ['CH', null],
        ['M', null],
      ]),
    ).toBe('2 tallas');
  });

  it('only mentions dimensions with a choice', () => {
    expect(meta('Tamaño', [['5', 'Blanco/Negro']], 'Color')).toBe('');
    expect(
      meta(
        'Talla',
        [
          ['U', 'Rojo'],
          ['U', 'Azul'],
        ],
        'Color',
      ),
    ).toBe('2 colores');
    expect(meta('Talla', [[null, null]])).toBe('');
  });
});

describe('validateBuildRows', () => {
  it('accepts valid rows', () => {
    const rows = validateBuildRows(rawRows());
    expect(rows.public_products).toHaveLength(1);
  });

  it('lists every invalid row with its view and id', () => {
    const raw = rawRows();
    (raw.public_products[0] as Record<string, unknown>).name = ' ';
    (raw.public_brands[0] as Record<string, unknown>).slug = 'P&P';
    raw.public_product_variants.push({ id: 'x' });
    try {
      validateBuildRows(raw);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BuildDataError);
      const { problems, message } = error as BuildDataError;
      expect(problems).toHaveLength(3);
      expect(problems[0]).toBe(`public_products id ${id(1)}: name: vacío`);
      expect(problems[1]).toMatch(/^public_product_variants id x: /);
      expect(problems[2]).toBe(`public_brands id ${id(10)}: slug: slug inválido`);
      expect(message).toMatch(/^Datos inválidos para el build \(3 problemas\)/);
    }
  });

  it('reports a view that could not be read', () => {
    const raw = rawRows() as Record<string, unknown>;
    delete raw.public_stores;
    expect(() => validateBuildRows(raw as RawBuildRows)).toThrow(
      'public_stores: no se pudo leer la vista.',
    );
  });
});

describe('buildCatalog', () => {
  it('turns the views into catalog.json', () => {
    const catalog = buildCatalog(validateBuildRows(rawRows()), NOW);
    expect(catalog.generatedAt).toBe(NOW);
    expect(catalog.products).toEqual([
      {
        id: id(1),
        sku: 'UNI-001',
        slug: 'uniforme-futbol',
        name: 'Uniforme de Fútbol',
        brand: { slug: 'pyp', name: 'P&P' },
        category: 'uniformes',
        subcategory: 'uniformes-futbol',
        sports: ['futbol'],
        audience: 'unisex',
        customizable: true,
        featured: true,
        sortOrder: 0,
        publishedAt: '2026-10-11T21:05:33.571111+00:00',
        // The product image (no variant) wins over a variant's image.
        image: { keyBase: 'p/1/a', alt: 'Frente' },
        option1Name: 'Talla',
        option2Name: null,
        variants: [
          { id: id(2), sku: 'UNI-001-CH', o1: 'CH', o2: null },
          { id: id(3), sku: 'UNI-001-M', o1: 'M', o2: null },
        ],
        meta: '2 tallas · colores a elegir',
      },
    ]);
    expect(catalog.categories).toEqual([
      { slug: 'uniformes', name: 'Uniformes', parent: null },
      { slug: 'uniformes-futbol', name: 'Uniformes de fútbol', parent: 'uniformes' },
    ]);
    expect(catalog.sports).toEqual([{ slug: 'futbol', name: 'Fútbol' }]);
    expect(catalog.brands).toEqual([{ slug: 'pyp', name: 'P&P' }]);
  });

  it('accepts a catalog without products (production before phase 7)', () => {
    const raw = rawRows();
    raw.public_products = [];
    raw.public_product_variants = [];
    raw.public_product_images = [];
    raw.public_product_sports = [];
    const catalog = buildCatalog(validateBuildRows(raw), NOW);
    expect(catalog.products).toEqual([]);
    expect(catalog.categories).toHaveLength(2);
  });

  it('fails when a product has no variants or its brand is missing', () => {
    const raw = rawRows();
    raw.public_product_variants = [];
    raw.public_brands = [];
    expect(() => buildCatalog(validateBuildRows(raw), NOW)).toThrow(
      new RegExp(
        `public_products id ${id(1)} \\(UNI-001\\): su marca no está en public_brands\\.[\\s\\S]*no tiene variantes activas`,
      ),
    );
  });
});

describe('buildSettings', () => {
  it('turns the views into settings.json', () => {
    const settings = buildSettings(validateBuildRows(rawRows()), NOW);
    expect(settings.whatsappSalesNumber).toBe('5500000000');
    expect(settings.flags).toEqual({
      showPrices: false,
      enableCheckout: false,
      enableShipping: false,
      enableStock: false,
    });
    expect(settings.store.postalCode).toBe('14330');
    expect(settings.siteMedia.home_hero).toBeNull();
    expect(settings.siteMedia.advisor).toEqual({
      keyBase: 's/advisor/x',
      alt: 'Ana',
      width: 600,
      height: 600,
    });
    expect(settings.siteTexts.uniforms_faq[0]?.answer).toBe('[PEDIDO MÍNIMO]');
    expect(settings.privacyVersion).toBe('2026-10');
  });

  it('fails with the key of each missing or invalid setting', () => {
    const raw = rawRows();
    raw.public_settings = raw.public_settings.filter((s) => (s as { key: string }).key !== 'flags');
    (raw.public_settings[0] as { value: unknown }).value = '+52 55 0000 0000';
    raw.public_site_texts = raw.public_site_texts.filter(
      (t) => (t as { key: string }).key !== 'privacy_notice',
    );
    raw.public_stores = [];
    try {
      buildSettings(validateBuildRows(raw), NOW);
      expect.unreachable();
    } catch (error) {
      expect((error as BuildDataError).problems).toEqual([
        'public_settings key whatsapp_sales_number: 10 dígitos sin +52',
        'public_settings key flags: falta (o no es público).',
        'public_site_texts key privacy_notice: falta.',
        'public_stores: no hay ninguna tienda activa.',
      ]);
    }
  });
});
