import { describe, expect, it } from 'vitest';
import type { CatalogJson, CatalogProduct } from './catalog.ts';
import {
  categoriesIn,
  featuredProducts,
  listingProducts,
  productCount,
  sortProducts,
  sportShortcuts,
} from './listing.ts';

let n = 0;
function product(overrides: Partial<CatalogProduct>): CatalogProduct {
  n += 1;
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  return {
    id,
    sku: `SKU-${n}`,
    slug: `producto-${n}`,
    name: `Producto ${n}`,
    brand: { slug: 'pyp', name: 'P&P' },
    category: 'uniformes',
    subcategory: 'uniformes-futbol',
    sports: ['futbol'],
    audience: 'unisex',
    customizable: false,
    featured: false,
    sortOrder: 0,
    publishedAt: '2026-10-01T00:00:00.000Z',
    image: null,
    option1Name: 'Talla',
    option2Name: null,
    variants: [{ id, sku: `SKU-${n}`, o1: null, o2: null }],
    meta: '',
    ...overrides,
  };
}

const jersey = product({ name: 'Jersey', featured: true, sortOrder: 2 });
const short = product({ name: 'Short', featured: true, sortOrder: 1 });
const balon = product({
  name: 'Balón Molten',
  category: 'balones',
  subcategory: 'balones-futbol',
  brand: { slug: 'molten', name: 'Molten' },
  publishedAt: '2026-10-10T00:00:00.000Z',
});
const balon2 = product({
  name: 'Balón Adidas',
  category: 'balones',
  subcategory: 'balones-futbol',
  brand: { slug: 'adidas', name: 'Adidas' },
});
const guante = product({
  name: 'Guante de box',
  category: 'box-y-combate',
  subcategory: 'guantes-box',
  sports: ['box'],
});

const catalog: CatalogJson = {
  generatedAt: '2026-10-12T00:00:00.000Z',
  products: [balon, guante, jersey, balon2, short],
  sports: [
    { slug: 'futbol', name: 'Fútbol' },
    { slug: 'box', name: 'Box' },
  ],
  categories: [
    { slug: 'uniformes', name: 'Uniformes', parent: null },
    { slug: 'balones', name: 'Balones', parent: null },
    { slug: 'box-y-combate', name: 'Box y combate', parent: null },
    { slug: 'uniformes-futbol', name: 'Uniformes de fútbol', parent: 'uniformes' },
    { slug: 'balones-futbol', name: 'Balones de fútbol', parent: 'balones' },
    { slug: 'guantes-box', name: 'Guantes de box', parent: 'box-y-combate' },
  ],
  brands: [],
};

const names = (products: CatalogProduct[]) => products.map((p) => p.name);

describe('sortProducts', () => {
  it('puts featured products first, then the admin order, then the name', () => {
    expect(names(sortProducts(catalog.products))).toEqual([
      'Short',
      'Jersey',
      'Balón Adidas',
      'Balón Molten',
      'Guante de box',
    ]);
  });

  it('sorts by newest, name and brand', () => {
    expect(names(sortProducts(catalog.products, 'nuevos'))[0]).toBe('Balón Molten');
    expect(names(sortProducts(catalog.products, 'nombre'))).toEqual([
      'Balón Adidas',
      'Balón Molten',
      'Guante de box',
      'Jersey',
      'Short',
    ]);
    expect(names(sortProducts(catalog.products, 'marca')).slice(0, 2)).toEqual([
      'Balón Adidas',
      'Balón Molten',
    ]);
  });
});

describe('listingProducts', () => {
  it('selects the products of each static route', () => {
    expect(listingProducts(catalog, { kind: 'all' })).toHaveLength(5);
    expect(names(listingProducts(catalog, { kind: 'category', category: 'balones' }))).toEqual([
      'Balón Adidas',
      'Balón Molten',
    ]);
    expect(
      names(
        listingProducts(catalog, {
          kind: 'subcategory',
          category: 'uniformes',
          subcategory: 'uniformes-futbol',
        }),
      ),
    ).toEqual(['Short', 'Jersey']);
    expect(listingProducts(catalog, { kind: 'sport', sport: 'futbol' })).toHaveLength(4);
    expect(names(listingProducts(catalog, { kind: 'brand', brand: 'molten' }))).toEqual([
      'Balón Molten',
    ]);
  });

  it('is empty for an empty catalog', () => {
    expect(listingProducts({ ...catalog, products: [] }, { kind: 'all' })).toEqual([]);
  });
});

describe('categoriesIn and sportShortcuts', () => {
  const futbol = listingProducts(catalog, { kind: 'sport', sport: 'futbol' });

  it('lists the categories present, in catalog order, with counts', () => {
    expect(categoriesIn(catalog, futbol)).toEqual([
      { slug: 'uniformes', name: 'Uniformes', parent: null, count: 2 },
      { slug: 'balones', name: 'Balones', parent: null, count: 2 },
    ]);
    expect(categoriesIn(catalog, futbol, 'sub').map((c) => c.slug)).toEqual([
      'uniformes-futbol',
      'balones-futbol',
    ]);
  });

  it('picks the two biggest subcategories of a sport, Uniformes first on a tie', () => {
    expect(sportShortcuts(catalog, futbol).map((c) => c.name)).toEqual([
      'Uniformes de fútbol',
      'Balones de fútbol',
    ]);
    const extra = product({ category: 'balones', subcategory: 'balones-futbol' });
    expect(sportShortcuts(catalog, [...futbol, extra]).map((c) => c.slug)).toEqual([
      'balones-futbol',
      'uniformes-futbol',
    ]);
  });
});

describe('productCount', () => {
  it('agrees in number', () => {
    expect(productCount(1)).toBe('1 producto');
    expect(productCount(28)).toBe('28 productos');
    expect(productCount(0)).toBe('0 productos');
  });
});

describe('featuredProducts', () => {
  it('takes the featured products first and fills up with the rest', () => {
    expect(names(featuredProducts(catalog.products, 3))).toEqual([
      'Short',
      'Jersey',
      'Balón Adidas',
    ]);
    expect(featuredProducts([], 4)).toEqual([]);
  });
});
