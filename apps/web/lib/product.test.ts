// @vitest-environment node
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadBuildData } from './data';
import { buildProductPage, siteUrl } from './product';

const load = () =>
  loadBuildData({ BUILD_DATA_FILE: resolve(__dirname, '../fixtures/build-data.json') });

describe('buildProductPage', () => {
  it('builds the full page of a customizable product', async () => {
    const { rows, catalog, settings } = await load();
    const page = buildProductPage(rows, catalog, settings, 'uniforme-basquetbol-completo', null);
    expect(page?.product.name).toBe('Uniforme de Básquetbol Completo');
    expect(page?.relatedTitle).toBe('Completa el uniforme');
    expect(page?.badges.map((b) => b.label)).toContain('Personalizable');
    expect(page?.options[0]).toEqual({
      label: 'Tallas',
      values: expect.arrayContaining(['CH', 'M']),
    });
    expect(page?.specs.map((s) => s.label)).toEqual(['Marca', 'Tallas', 'Colores', 'Técnicas']);
    expect(page?.breadcrumbs.map((b) => b.label)).toEqual([
      'Inicio',
      'Uniformes',
      'Uniformes de básquetbol',
      'Uniforme de Básquetbol Completo',
    ]);
    expect(page?.related.length).toBeGreaterThan(0);
    expect(page?.related.every((p) => p.id !== page.product.id)).toBe(true);
  });

  it('builds the simple page of a product that is not customizable', async () => {
    const { rows, catalog, settings } = await load();
    const page = buildProductPage(rows, catalog, settings, 'balon-soccer-cruzeiro', null);
    expect(page?.relatedTitle).toBe('También te puede interesar');
    expect(page?.specs[1]).toEqual({ label: 'Tamaños', value: '3, 4 y 5' });
    expect(page?.images).toEqual([]);
  });

  it('writes Product JSON-LD without offers, and absolute links only with a site URL', async () => {
    const { rows, catalog, settings } = await load();
    const local = buildProductPage(rows, catalog, settings, 'balon-soccer-cruzeiro', null);
    expect(local?.jsonLd).toMatchObject({
      '@type': 'Product',
      name: 'Balón Soccer Cruzeiro',
      sku: 'BAL-002',
      brand: { '@type': 'Brand', name: 'Cruzeiro' },
    });
    expect(local?.jsonLd).not.toHaveProperty('offers');
    expect(local?.jsonLd).not.toHaveProperty('url');
    expect(local?.askUrl).toBe(
      `https://wa.me/525500000000?text=${encodeURIComponent('Hola, me interesa *Balón Soccer Cruzeiro* (BAL-002).')}`,
    );

    const live = buildProductPage(
      rows,
      catalog,
      settings,
      'balon-soccer-cruzeiro',
      'https://pypdeportescoapa.com',
    );
    expect(live?.jsonLd.url).toBe('https://pypdeportescoapa.com/producto/balon-soccer-cruzeiro');
    expect(live?.jsonLd.image).toEqual([
      'https://pypdeportescoapa.com/img/placeholder/balones.webp',
    ]);
    expect(decodeURIComponent(live?.askUrl ?? '')).toContain(
      'https://pypdeportescoapa.com/producto/balon-soccer-cruzeiro',
    );
  });

  it('returns null for a slug that is not published', async () => {
    const { rows, catalog, settings } = await load();
    expect(buildProductPage(rows, catalog, settings, '_', null)).toBeNull();
  });
});

describe('siteUrl', () => {
  it('reads NEXT_PUBLIC_SITE_URL without the trailing slash', () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'https://pypdeportescoapa.com/' })).toBe(
      'https://pypdeportescoapa.com',
    );
    expect(siteUrl({})).toBeNull();
  });
});
