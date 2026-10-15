// CSV catalog importer (T1.5): `pnpm db:import docs/data/catalogo-inicial.csv`.
// Reads the CSV (format: docs/data/sitio-actual.md §4) and sends it in batches of up to 50 rows
// to admin_import_products, the same function the admin panel uses. It runs on pyp-dev through
// scripts/supabase-dev.mjs, acting as service_role inside each transaction.

import { readFileSync } from 'node:fs';
import pg from 'pg';

// The file functions are shared with the admin panel (packages/shared/src/import-file.ts): both
// read the CSV the same way. Node 24 loads the TypeScript file directly (type stripping).
import {
  mergeResults,
  parseCsv,
  toBatches,
  toImportRows,
} from '../packages/shared/src/import-file.ts';

export { mergeResults, parseCsv, toBatches, toImportRows };
export const BATCH_SIZE = 50;

export async function importCatalog({ file, connectionString, ssl }) {
  const rows = toImportRows(parseCsv(readFileSync(file, 'utf8')));
  if (rows.length === 0) {
    console.log('El CSV no tiene filas.');
    return true;
  }
  const client = new pg.Client({ connectionString, ssl });
  await client.connect();
  const results = [];
  try {
    for (const batch of toBatches(rows)) {
      await client.query('begin');
      try {
        await client.query(
          `select set_config('request.jwt.claims', '{"role": "service_role"}', true)`,
        );
        await client.query('set local role service_role');
        const { rows: out } = await client.query(
          'select public.admin_import_products($1::jsonb) as result',
          [JSON.stringify(batch)],
        );
        await client.query('commit');
        results.push(out[0].result);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }
  } finally {
    await client.end();
  }

  const total = mergeResults(results);
  console.log(`✓ ${rows.length} filas: ${total.created} creados, ${total.updated} actualizados`);
  for (const warning of total.warnings) {
    console.log(`  ⚠ fila ${warning.row} (${warning.sku}): ${warning.message}`);
  }
  for (const error of total.errors) {
    console.log(`  ✖ fila ${error.row} (${error.sku ?? 'sin SKU'}): ${error.message}`);
  }
  return total.errors.length === 0;
}
