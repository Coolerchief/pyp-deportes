// CSV catalog importer (T1.5): `pnpm db:import docs/data/catalogo-inicial.csv`.
// Reads the CSV (format: docs/data/sitio-actual.md §4) and sends it in batches of up to 50 rows
// to admin_import_products, the same function the admin panel uses. It runs on pyp-dev through
// scripts/supabase-dev.mjs, acting as service_role inside each transaction.

import { readFileSync } from 'node:fs';
import pg from 'pg';

export const BATCH_SIZE = 50;

/**
 * Parses CSV text (RFC 4180: quoted fields, doubled quotes, commas and line breaks inside quotes,
 * CRLF and a UTF-8 BOM). Returns an array of rows, each an array of strings.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^﻿/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

/**
 * Turns parsed CSV rows into objects keyed by the header, adding `_row`: the spreadsheet line
 * number (the header is line 1), which admin_import_products reports in its errors.
 */
export function toImportRows(table) {
  const [header, ...body] = table;
  if (!header) return [];
  const keys = header.map((key) => key.trim());
  return body.map((cells, index) => ({
    ...Object.fromEntries(keys.map((key, i) => [key, (cells[i] ?? '').trim()])),
    _row: index + 2,
  }));
}

export function toBatches(rows, size = BATCH_SIZE) {
  const batches = [];
  for (let i = 0; i < rows.length; i += size) batches.push(rows.slice(i, i + size));
  return batches;
}

/** Adds up the per-batch results of admin_import_products. */
export function mergeResults(results) {
  return results.reduce(
    (total, result) => ({
      created: total.created + result.created,
      updated: total.updated + result.updated,
      errors: [...total.errors, ...result.errors],
      warnings: [...total.warnings, ...result.warnings],
    }),
    { created: 0, updated: 0, errors: [], warnings: [] },
  );
}

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
