// Security test 8 of docs/05-BACKEND-SCHEMA.md §7: concurrent next_folio() calls never repeat a
// number. pgTAP runs on a single connection, so this opens several at once, each holding its
// transaction open for a moment so the calls overlap. It uses the year 2999 and deletes that
// counter afterwards, so real folios are untouched.
//
// Runs inside `pnpm test:db` (pyp-dev) and in CI with DATABASE_URL pointing at the runner's
// throwaway database: `node scripts/folio-concurrency.mjs`.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const TEST_YEAR = 2999;

/** Checks that the folios are exactly PYP-2999-000001 … 00000n, each once. */
export function checkFolios(folios, n, year = TEST_YEAR) {
  const expected = Array.from(
    { length: n },
    (_, i) => `PYP-${year}-${String(i + 1).padStart(6, '0')}`,
  );
  const sorted = [...folios].sort();
  const duplicates = sorted.filter((folio, i) => folio === sorted[i - 1]);
  const ok = sorted.length === n && sorted.every((folio, i) => folio === expected[i]);
  return { ok, duplicates };
}

export async function runFolioConcurrency({ connectionString, ssl, n = 8 }) {
  const connect = async () => {
    const client = new pg.Client({ connectionString, ssl });
    await client.connect();
    return client;
  };
  const admin = await connect();
  const cleanup = () =>
    admin.query('delete from public.folio_counters where year = $1', [TEST_YEAR]);
  const clients = [];
  try {
    await cleanup();
    for (let i = 0; i < n; i += 1) clients.push(await connect());
    const folios = await Promise.all(
      clients.map(async (client) => {
        await client.query('begin');
        const { rows } = await client.query('select public.next_folio($1) as folio', [
          `${TEST_YEAR}-06-01T12:00:00Z`,
        ]);
        await client.query('select pg_sleep(0.2)');
        await client.query('commit');
        return rows[0].folio;
      }),
    );
    const result = checkFolios(folios, n);
    const label = `${n} llamadas simultáneas a next_folio`;
    if (result.ok) console.log(`✓ ${label}: folios únicos y consecutivos`);
    else console.log(`✖ ${label}: ${folios.join(', ')}`);
    return result.ok;
  } finally {
    await Promise.all(clients.map((client) => client.end()));
    await cleanup();
    await admin.end();
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Falta DATABASE_URL.');
    process.exit(1);
  }
  const ok = await runFolioConcurrency({ connectionString });
  process.exit(ok ? 0 : 1);
}
