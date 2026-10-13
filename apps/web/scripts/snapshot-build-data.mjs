// Saves the public_* views of pyp-dev to fixtures/build-data.json, the copy CI and E2E build
// from (BUILD_DATA_FILE) because they have no database. Also writes fixtures/build-data-empty.json,
// the same copy without products: production until phase 7, which CI builds too so an empty
// catalog never breaks the deploy. Only public views, read with the anon key: no customer data,
// no prices. Run again after changing the views or the seed:
//   pnpm --filter @pyp/web data:snapshot

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, '../fixtures/build-data.json');
const emptyOutput = resolve(here, '../fixtures/build-data-empty.json');

/** Views emptied in the empty-catalog copy; taxonomy, settings, texts and media stay. */
export const PRODUCT_VIEWS = [
  'public_products',
  'public_product_variants',
  'public_product_images',
  'public_product_sports',
];

/** The snapshot as production looks before the real catalog is loaded (phase 7). */
export function withoutProducts(snapshot) {
  const views = { ...snapshot.views };
  for (const view of PRODUCT_VIEWS) views[view] = [];
  return { ...snapshot, source: `${snapshot.source} sin productos`, views };
}

/** Same names and order as BUILD_VIEWS in packages/shared (checked by a test). */
export const SNAPSHOT_VIEWS = {
  public_products: 'id',
  public_product_variants: 'id',
  public_product_images: 'id',
  public_product_sports: 'product_id,sport_id',
  public_sports: 'id',
  public_categories: 'id',
  public_brands: 'id',
  public_stores: 'id',
  public_settings: 'key',
  public_site_texts: 'key',
  public_site_media: 'slot',
};

async function main() {
  process.loadEnvFile(resolve(here, '../../../.env.local'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const devRef = process.env.SUPABASE_DEV_PROJECT_REF;
  if (!url || !key || !devRef) throw new Error('Faltan las variables de pyp-dev en .env.local.');
  if (new URL(url).hostname !== `${devRef}.supabase.co`) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no es pyp-dev: la copia solo se toma de pyp-dev.');
  }
  const views = {};
  for (const [view, order] of Object.entries(SNAPSHOT_VIEWS)) {
    const response = await fetch(`${url}/rest/v1/${view}?select=*&order=${order}`, {
      headers: { apikey: key },
    });
    if (!response.ok) throw new Error(`${view}: HTTP ${response.status}`);
    views[view] = await response.json();
  }
  const snapshot = { source: 'pyp-dev', takenAt: new Date().toISOString(), views };
  writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(emptyOutput, `${JSON.stringify(withoutProducts(snapshot), null, 2)}\n`);
  const counts = Object.entries(views).map(([view, rows]) => `${view} ${rows.length}`);
  console.log(`✓ ${output}\n  ${counts.join(' · ')}\n✓ ${emptyOutput} (sin productos)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
