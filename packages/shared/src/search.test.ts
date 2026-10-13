import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCatalog, type RawBuildRows, validateBuildRows } from './build-data';
import {
  buildCatalogSearch,
  searchProducts,
  searchSuggestions,
  searchTerm,
  suggestCorrection,
} from './search';

// The CI snapshot of pyp-dev: the 56 test products, as the site indexes them.
const snapshot = JSON.parse(
  readFileSync(resolve(__dirname, '../../../apps/web/fixtures/build-data.json'), 'utf8'),
) as { views: RawBuildRows };
const catalog = buildCatalog(validateBuildRows(snapshot.views), '2026-10-12T00:00:00.000Z');
const search = buildCatalogSearch(catalog);
const names = (q: string) => searchProducts(search, q).map((p) => p.name);

describe('searchTerm', () => {
  it('drops accents and makes a simple singular', () => {
    expect(searchTerm('Balones')).toBe('balon');
    expect(searchTerm('balón')).toBe('balon');
    expect(searchTerm('Guantes')).toBe('guante');
    expect(searchTerm('tallas')).toBe('talla');
    expect(searchTerm('box')).toBe('box');
    expect(searchTerm('gas')).toBe('gas');
  });
});

describe('searchProducts', () => {
  it('finds "Fútbol" when typing "futbol"', () => {
    const results = names('futbol');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((name) => name.includes('Fútbol'))).toBe(true);
  });

  it('meets singular, plural and accents', () => {
    expect(names('balones').length).toBeGreaterThan(0);
    expect(names('balon')).toEqual(names('balones'));
    expect(names('BALÓN')).toEqual(names('balon'));
  });

  it('puts name matches before brand or category matches', () => {
    const [first] = searchProducts(search, 'molten');
    expect(first?.brand.name).toBe('Molten');
  });

  it('searches by SKU and by the start of a word', () => {
    const [product] = catalog.products;
    expect(names(product!.sku.toLowerCase())[0]).toBe(product!.name);
    expect(names('espinill').length).toBeGreaterThan(0);
  });

  it('needs 2 characters and returns nothing for unknown words', () => {
    expect(names('b')).toEqual([]);
    expect(names('patineta')).toEqual([]);
  });
});

describe('suggestCorrection', () => {
  it('suggests "balón" for "valon"', () => {
    expect(suggestCorrection(search, 'valon')).toBe('balón');
  });

  it('says nothing when the query is written right or nothing is close', () => {
    expect(suggestCorrection(search, 'balón')).toBeNull();
    expect(suggestCorrection(search, 'bal')).toBeNull();
    expect(suggestCorrection(search, 'xqzw')).toBeNull();
  });
});

describe('searchSuggestions', () => {
  it('offers up to 6 products and 3 categories', () => {
    const { products, categories } = searchSuggestions(search, catalog, 'bal');
    expect(products.length).toBeLessThanOrEqual(6);
    expect(products.length).toBeGreaterThan(0);
    expect(categories.length).toBeLessThanOrEqual(3);
    expect(categories[0]?.name).toMatch(/^Balones/);
  });
});
