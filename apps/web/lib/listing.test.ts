// @vitest-environment node
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadBuildData } from './data';
import { buildListing, EMPTY_PARAM, staticParams } from './listing';

const WA = 'https://wa.me/525500000000';
const load = (file: string) =>
  loadBuildData({ BUILD_DATA_FILE: resolve(__dirname, `../fixtures/${file}`) });

describe('buildListing', () => {
  it('builds /catalogo with every product and a chip per category', async () => {
    const { catalog } = await load('build-data.json');
    const listing = buildListing(catalog, WA, { kind: 'all' });
    expect(listing?.products).toHaveLength(56);
    expect(listing?.breadcrumbs).toEqual([{ label: 'Inicio', href: '/' }, { label: 'Catálogo' }]);
    expect(listing?.chips[0]).toEqual({ label: 'Todo', href: '/catalogo', active: true });
    expect(listing?.chips[1]?.href).toMatch(/^\/catalogo\/[a-z-]+$/);
  });

  it('builds a category and its subcategory with sibling chips', async () => {
    const { catalog } = await load('build-data.json');
    const category = buildListing(catalog, WA, { kind: 'category', category: 'balones' });
    expect(category?.title).toBe('Balones');
    expect(category?.chips.map((c) => c.href)).toContain('/catalogo/balones/balones-futbol');

    const sub = buildListing(catalog, WA, {
      kind: 'subcategory',
      category: 'balones',
      subcategory: 'balones-futbol',
    });
    expect(sub?.title).toBe('Balones de fútbol');
    expect(sub?.products.every((p) => p.subcategory === 'balones-futbol')).toBe(true);
    expect(sub?.breadcrumbs.map((b) => b.label)).toEqual([
      'Inicio',
      'Catálogo',
      'Balones',
      'Balones de fútbol',
    ]);
    expect(sub?.chips.find((c) => c.active)?.href).toBe('/catalogo/balones/balones-futbol');
  });

  it('builds a sport page with its two shortcuts and a brand page', async () => {
    const { catalog } = await load('build-data.json');
    const sport = buildListing(catalog, WA, { kind: 'sport', sport: 'futbol' });
    expect(sport?.products).toHaveLength(28);
    expect(sport?.shortcuts).toEqual([
      { label: 'Balones de fútbol', href: '/catalogo/balones/balones-futbol' },
      { label: 'Uniformes de fútbol', href: '/catalogo/uniformes/uniformes-futbol' },
    ]);
    // Its chips filter the same page (?categoria=) instead of leading to other routes.
    expect(sport?.chips).toEqual([]);
    expect(sport?.tabs?.[0]).toEqual({ label: 'Todo', category: null });
    expect(sport?.tabs?.map((t) => t.category)).toContain('balones');
    expect(sport?.basePath).toBe('/deporte/futbol');
    expect(sport?.scopeCounts.categoria.length).toBeGreaterThan(1);

    const brand = buildListing(catalog, WA, { kind: 'brand', brand: 'molten' });
    expect(brand?.products.every((p) => p.brand.slug === 'molten')).toBe(true);
    expect(brand?.breadcrumbs[1]).toEqual({ label: 'Marcas' });
  });

  it('returns null for a slug that is not in the catalog', async () => {
    const { catalog } = await load('build-data.json');
    expect(buildListing(catalog, WA, { kind: 'category', category: 'no-existe' })).toBeNull();
    expect(buildListing(catalog, WA, { kind: 'category', category: 'balones-futbol' })).toBeNull();
    expect(
      buildListing(catalog, WA, {
        kind: 'subcategory',
        category: 'uniformes',
        subcategory: 'balones-futbol',
      }),
    ).toBeNull();
    expect(buildListing(catalog, WA, { kind: 'sport', sport: EMPTY_PARAM })).toBeNull();
  });

  it('builds an empty /catalogo with the empty catalog of production', async () => {
    const { catalog } = await load('build-data-empty.json');
    const listing = buildListing(catalog, WA, { kind: 'all' });
    expect(listing?.products).toEqual([]);
    expect(listing?.chips).toEqual([{ label: 'Todo', href: '/catalogo', active: true }]);
  });
});

describe('staticParams', () => {
  it('lists one param per slug, or the stand-in when there is none', () => {
    expect(staticParams('deporte', ['futbol', 'box'])).toEqual([
      { deporte: 'futbol' },
      { deporte: 'box' },
    ]);
    expect(staticParams('deporte', [])).toEqual([{ deporte: EMPTY_PARAM }]);
  });
});
