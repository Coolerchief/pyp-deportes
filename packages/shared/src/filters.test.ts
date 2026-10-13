import { describe, expect, it } from 'vitest';
import type { CatalogProduct } from './catalog';
import {
  activeFilterCount,
  applyFilters,
  EMPTY_FILTERS,
  facetCounts,
  parseListingParams,
  serializeListingParams,
  toggleFilter,
} from './filters';

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
    subcategory: null,
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

const jersey = product({ name: 'Jersey', customizable: true });
const jerseyNino = product({ name: 'Jersey niño', customizable: true, audience: 'infantil' });
const balonMolten = product({
  name: 'Balón Molten',
  category: 'balones',
  brand: { slug: 'molten', name: 'Molten' },
});
const balonBasquet = product({
  name: 'Balón básquet',
  category: 'balones',
  brand: { slug: 'molten', name: 'Molten' },
  sports: ['basquetbol'],
});
const guante = product({
  name: 'Guante',
  category: 'box-y-combate',
  brand: { slug: 'cleto', name: 'Cleto Reyes' },
  sports: ['box'],
  audience: 'adulto',
});
const all = [jersey, jerseyNino, balonMolten, balonBasquet, guante];
const names = (products: CatalogProduct[]) => products.map((p) => p.name);

describe('parseListingParams and serializeListingParams', () => {
  it('reads several comma-separated values and the order', () => {
    const state = parseListingParams(
      '?categoria=balones,uniformes&marca=molten&para=infantil&personalizable=1&orden=nombre',
    );
    expect(state).toEqual({
      filters: {
        deporte: [],
        categoria: ['balones', 'uniformes'],
        marca: ['molten'],
        para: ['infantil'],
        personalizable: true,
      },
      sort: 'nombre',
    });
    expect(serializeListingParams(state)).toBe(
      '?categoria=balones,uniformes&marca=molten&para=infantil&personalizable=1&orden=nombre',
    );
  });

  it('drops unknown or malformed values so any shared URL is safe', () => {
    const state = parseListingParams(
      'para=gigante,adulto&categoria=<script>,balones,balones&orden=precio&personalizable=si',
    );
    expect(state.filters.para).toEqual(['adulto']);
    expect(state.filters.categoria).toEqual(['balones']);
    expect(state.filters.personalizable).toBe(false);
    expect(state.sort).toBe('destacados');
  });

  it('writes an empty query for the default view', () => {
    expect(serializeListingParams({ filters: EMPTY_FILTERS, sort: 'destacados' })).toBe('');
  });

  it('round-trips: sharing the URL reproduces the view', () => {
    const query = '?deporte=box,futbol&marca=cleto&orden=marca';
    expect(serializeListingParams(parseListingParams(query))).toBe(query);
  });
});

describe('search orders', () => {
  it('accepts "relevancia" only where the page allows it, and omits its default', () => {
    expect(parseListingParams('?orden=relevancia').sort).toBe('destacados');
    const sorts = { options: ['relevancia', 'nombre'] as const, default: 'relevancia' as const };
    expect(parseListingParams('', sorts).sort).toBe('relevancia');
    expect(parseListingParams('?orden=nombre', sorts).sort).toBe('nombre');
    expect(
      serializeListingParams({ filters: EMPTY_FILTERS, sort: 'relevancia' }, 'relevancia'),
    ).toBe('');
    expect(
      serializeListingParams({ filters: EMPTY_FILTERS, sort: 'destacados' }, 'relevancia'),
    ).toBe('?orden=destacados');
  });
});

describe('applyFilters', () => {
  it('ORs values inside a type and ANDs between types', () => {
    expect(
      names(applyFilters(all, { ...EMPTY_FILTERS, categoria: ['balones', 'box-y-combate'] })),
    ).toEqual(['Balón Molten', 'Balón básquet', 'Guante']);
    expect(
      names(applyFilters(all, { ...EMPTY_FILTERS, categoria: ['balones'], deporte: ['futbol'] })),
    ).toEqual(['Balón Molten']);
  });

  it('keeps only customizable products and filters by audience', () => {
    expect(names(applyFilters(all, { ...EMPTY_FILTERS, personalizable: true }))).toEqual([
      'Jersey',
      'Jersey niño',
    ]);
    expect(
      names(applyFilters(all, { ...EMPTY_FILTERS, personalizable: true, para: ['infantil'] })),
    ).toEqual(['Jersey niño']);
  });

  it('can end with no products', () => {
    expect(applyFilters(all, { ...EMPTY_FILTERS, marca: ['molten'], para: ['adulto'] })).toEqual(
      [],
    );
  });
});

describe('facetCounts', () => {
  it('counts each option without its own group narrowing it', () => {
    const counts = facetCounts(all, { ...EMPTY_FILTERS, categoria: ['balones'] });
    // Categories keep counting across all of them…
    expect(counts.categoria.get('uniformes')).toBe(2);
    expect(counts.categoria.get('balones')).toBe(2);
    // …while the other groups count inside "balones".
    expect(counts.marca.get('molten')).toBe(2);
    expect(counts.marca.get('pyp')).toBeUndefined();
    expect(counts.deporte.get('basquetbol')).toBe(1);
    expect(counts.personalizable).toBe(0);
  });

  it('counts customizable products under the other filters', () => {
    expect(facetCounts(all, EMPTY_FILTERS).personalizable).toBe(2);
    expect(facetCounts(all, { ...EMPTY_FILTERS, para: ['infantil'] }).personalizable).toBe(1);
  });
});

describe('toggleFilter and activeFilterCount', () => {
  it('adds and removes options and counts them', () => {
    let filters = toggleFilter(EMPTY_FILTERS, 'marca', 'molten');
    filters = toggleFilter(filters, 'para', 'infantil');
    expect(activeFilterCount({ ...filters, personalizable: true })).toBe(3);
    expect(toggleFilter(filters, 'marca', 'molten').marca).toEqual([]);
  });
});
