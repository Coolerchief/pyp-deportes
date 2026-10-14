import { describe, expect, it } from 'vitest';
import { CatalogJsonSchema, type CatalogJson } from './catalog.ts';
import { QUOTE_STATUSES, quoteStatusTransitions } from './labels.ts';

const catalog: CatalogJson = {
  generatedAt: '2026-10-11T07:20:23.478934+00:00',
  products: [
    {
      id: '0b6f0b6f-0000-4000-8000-000000000001',
      sku: 'UNI-001',
      slug: 'uniforme-futbol-completo',
      name: 'Uniforme de Fútbol Completo',
      brand: { slug: 'pyp', name: 'P&P' },
      category: 'uniformes',
      subcategory: 'uniformes-futbol',
      sports: ['futbol'],
      audience: 'unisex',
      customizable: true,
      featured: true,
      sortOrder: 0,
      publishedAt: '2026-10-11T07:20:23.478934+00:00',
      image: null,
      option1Name: 'Talla',
      option2Name: null,
      variants: [
        { id: '0b6f0b6f-0000-4000-8000-0000000000aa', sku: 'UNI-001-M', o1: 'M', o2: null },
      ],
      meta: '10 tallas · colores a elegir',
    },
  ],
  sports: [{ slug: 'futbol', name: 'Fútbol' }],
  categories: [
    { slug: 'uniformes', name: 'Uniformes', parent: null },
    { slug: 'uniformes-futbol', name: 'Uniformes de fútbol', parent: 'uniformes' },
  ],
  brands: [{ slug: 'pyp', name: 'P&P' }],
};

describe('CatalogJsonSchema', () => {
  it('accepts the catalog shape of §10, with Postgres timestamps', () => {
    expect(CatalogJsonSchema.parse(catalog)).toEqual(catalog);
  });

  it('rejects a product without variants', () => {
    const broken = structuredClone(catalog);
    broken.products[0]!.variants = [];
    const result = CatalogJsonSchema.safeParse(broken);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['products', 0, 'variants']);
  });

  it('rejects slugs with uppercase or spaces', () => {
    const broken = structuredClone(catalog);
    broken.products[0]!.category = 'Uniformes';
    expect(CatalogJsonSchema.safeParse(broken).success).toBe(false);
  });
});

describe('quote status transitions', () => {
  it('match the diagram of §4.5', () => {
    const pairs = QUOTE_STATUSES.flatMap((from) =>
      quoteStatusTransitions[from].map((to) => `${from}>${to}`),
    );
    expect(pairs.sort()).toEqual(
      [
        'new>in_progress',
        'new>quoted',
        'new>lost',
        'in_progress>quoted',
        'in_progress>lost',
        'quoted>won',
        'quoted>lost',
        'won>quoted',
        'lost>in_progress',
      ].sort(),
    );
  });
});
