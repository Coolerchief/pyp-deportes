import { describe, expect, it } from 'vitest';
import type { CatalogJson, CatalogProduct } from './catalog.ts';
import { optionValues, pluralLabel, productSpecs, relatedProducts } from './product-detail.ts';

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
    sortOrder: n,
    publishedAt: '2026-10-01T00:00:00.000Z',
    image: null,
    option1Name: 'Talla',
    option2Name: null,
    variants: [{ id, sku: `SKU-${n}`, o1: null, o2: null }],
    meta: '',
    ...overrides,
  };
}

const variant = (o1: string | null, o2: string | null = null) => ({
  id: `10000000-0000-4000-8000-${String((n += 1)).padStart(12, '0')}`,
  sku: 'V',
  o1,
  o2,
});

describe('pluralLabel and optionValues', () => {
  it('pluralizes option names and lists distinct values in order', () => {
    expect(pluralLabel('Talla')).toBe('Tallas');
    expect(pluralLabel('Tamaño')).toBe('Tamaños');
    expect(pluralLabel('Medida')).toBe('Medidas');
    expect(
      optionValues([variant('M', 'Rojo'), variant('G', 'Rojo'), variant('M', 'Azul')]),
    ).toEqual({ o1: ['M', 'G'], o2: ['Rojo', 'Azul'] });
  });
});

describe('productSpecs', () => {
  const base = {
    brand: { slug: 'cruzeiro', name: 'Cruzeiro' },
    option1Name: 'Tamaño',
    option2Name: null,
    variants: [variant('#3'), variant('#4'), variant('#5')],
    customizable: false,
    techniques: [] as const,
    colorNote: null,
    minSuggestedQty: null,
    specs: [],
  };

  it('writes the rows of the design from the data', () => {
    expect(productSpecs(base)).toEqual([
      { label: 'Marca', value: 'Cruzeiro' },
      { label: 'Tamaños', value: '#3, #4 y #5' },
    ]);
  });

  it('adds colors, techniques, suggested order and the admin specs, which win', () => {
    expect(
      productSpecs({
        ...base,
        option1Name: 'Talla',
        variants: [variant('CH'), variant('M')],
        customizable: true,
        techniques: ['sublimacion', 'vinil', 'bordado'],
        colorNote: 'A elegir con tu asesor',
        minSuggestedQty: 12,
        specs: [
          { label: 'Tela', value: 'Dry-fit' },
          { label: 'Marca', value: 'P&P, hecho en taller propio' },
        ],
      }),
    ).toEqual([
      { label: 'Tallas', value: 'CH y M' },
      { label: 'Colores', value: 'A elegir con tu asesor' },
      { label: 'Técnicas', value: 'Sublimación · Vinil textil · Bordado' },
      { label: 'Pedido sugerido', value: 'Desde 12 piezas' },
      { label: 'Tela', value: 'Dry-fit' },
      { label: 'Marca', value: 'P&P, hecho en taller propio' },
    ]);
  });
});

describe('relatedProducts', () => {
  const uniforme = product({ name: 'Uniforme', customizable: true });
  const medias = product({
    name: 'Medias',
    category: 'ropa-deportiva',
    subcategory: 'medias',
    customizable: true,
  });
  const balon = product({ name: 'Balón', category: 'balones', subcategory: 'balones-futbol' });
  const balon2 = product({ name: 'Balón 2', category: 'balones', subcategory: 'balones-futbol' });
  const balonBasquet = product({
    name: 'Balón básquet',
    category: 'balones',
    subcategory: 'balones-basquetbol',
    sports: ['basquetbol'],
  });
  const guante = product({
    name: 'Guante',
    category: 'box-y-combate',
    subcategory: 'guantes',
    sports: ['box'],
  });
  const catalog = {
    products: [uniforme, medias, balon, balon2, balonBasquet, guante],
  } as CatalogJson;
  const names = (products: CatalogProduct[]) => products.map((p) => p.name);

  it('completes a uniform with other customizable pieces of its sport first', () => {
    expect(names(relatedProducts(catalog, uniforme))).toEqual(['Medias', 'Balón', 'Balón 2']);
  });

  it('offers the same subcategory, then category, then sport for a simple product', () => {
    expect(names(relatedProducts(catalog, balon))).toEqual([
      'Balón 2',
      'Balón básquet',
      'Uniforme',
      'Medias',
    ]);
    expect(names(relatedProducts(catalog, guante))).toEqual([]);
  });
});
