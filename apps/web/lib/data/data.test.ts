// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BUILD_VIEWS } from '@pyp/shared';
import { describe, expect, it } from 'vitest';
import { SNAPSHOT_VIEWS, withoutProducts } from '../../scripts/snapshot-build-data.mjs';
import { loadBuildData } from './index';

const FIXTURE = resolve(__dirname, '../../fixtures/build-data.json');
const EMPTY_FIXTURE = resolve(__dirname, '../../fixtures/build-data-empty.json');

describe('build data', () => {
  it('builds catalog.json and settings.json from the CI snapshot', async () => {
    const { catalog, settings } = await loadBuildData({ BUILD_DATA_FILE: FIXTURE });
    expect(catalog.products).toHaveLength(56);
    expect(catalog.products.flatMap((p) => p.variants)).toHaveLength(313);
    expect(catalog.sports.map((s) => s.slug)).toContain('futbol');
    expect(settings.store.slug).toBe('coapa');
    expect(Object.keys(settings.siteMedia)).toHaveLength(8);
  });

  // Production has no products until phase 7: the deploy must still publish the site.
  it('builds an empty catalog without failing', async () => {
    const { catalog, settings } = await loadBuildData({ BUILD_DATA_FILE: EMPTY_FIXTURE });
    expect(catalog.products).toEqual([]);
    expect(catalog.categories.length).toBeGreaterThan(0);
    expect(settings.store.slug).toBe('coapa');
  });

  it('keeps the empty copy in step with the CI snapshot', () => {
    const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
    expect(read(EMPTY_FIXTURE)).toEqual(withoutProducts(read(FIXTURE)));
  });

  it('fails with the view and the row id when a record is invalid', async () => {
    const snapshot = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    const product = snapshot.views.public_products[0];
    product.slug = 'Con Espacios';
    const file = join(mkdtempSync(join(tmpdir(), 'pyp-build-data-')), 'bad.json');
    writeFileSync(file, JSON.stringify(snapshot));
    await expect(loadBuildData({ BUILD_DATA_FILE: file })).rejects.toThrow(
      `public_products id ${product.id}: slug: slug inválido`,
    );
  });

  it('explains what is missing without Supabase variables or snapshot', async () => {
    await expect(loadBuildData({})).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('snapshots the same views, in the same order, that the build reads', () => {
    expect(SNAPSHOT_VIEWS).toEqual(
      Object.fromEntries(Object.entries(BUILD_VIEWS).map(([view, { order }]) => [view, order])),
    );
  });
});
