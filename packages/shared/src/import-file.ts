// Reading and writing the catalog file (T1.5, T4.6). The panel and scripts/import-catalog.mjs use
// these same functions, so importing from the panel gives the same rows as `pnpm db:import`.
// No dependencies: Node (the script, with type stripping) and the browser load this file as is.

import { IMPORT_BATCH_SIZE, IMPORT_COLUMNS } from './importer.ts';

export type ImportFileRow = Record<string, string> & { _row: number };

/**
 * Parses CSV text (RFC 4180: quoted fields, doubled quotes, commas and line breaks inside quotes,
 * CRLF and a UTF-8 BOM). Returns an array of rows, each an array of strings; blank lines go.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
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
 * Turns a table into objects keyed by the header, adding `_row`: the spreadsheet line number
 * (the header is line 1), which admin_import_products reports in its errors.
 */
export function toImportRows(table: readonly (readonly string[])[]): ImportFileRow[] {
  const [header, ...body] = table;
  if (!header) return [];
  const keys = header.map((key) => key.trim().toLowerCase());
  return body.map(
    (cells, index) =>
      ({
        ...Object.fromEntries(keys.map((key, i) => [key, String(cells[i] ?? '').trim()])),
        _row: index + 2,
      }) as ImportFileRow,
  );
}

/** Columns of the template that the file lacks (the header is read without case). */
export function missingColumns(table: readonly (readonly string[])[]): string[] {
  const header = new Set((table[0] ?? []).map((key) => key.trim().toLowerCase()));
  return IMPORT_COLUMNS.filter((column) => !header.has(column));
}

export function toBatches<T>(rows: readonly T[], size: number = IMPORT_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) batches.push(rows.slice(i, i + size));
  return batches;
}

type BatchResult = {
  created: number;
  updated: number;
  errors: { row: number; sku: string | null; message: string }[];
  warnings: { row: number; sku: string; message: string }[];
};

/** Adds up the per-batch results of admin_import_products. */
export function mergeResults(results: readonly BatchResult[]): BatchResult {
  return results.reduce<BatchResult>(
    (total, result) => ({
      created: total.created + result.created,
      updated: total.updated + result.updated,
      errors: [...total.errors, ...result.errors],
      warnings: [...total.warnings, ...result.warnings],
    }),
    { created: 0, updated: 0, errors: [], warnings: [] },
  );
}

/** One CSV field, quoted only when it needs it. */
function csvField(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV text with a UTF-8 BOM (Excel then reads the accents right) and CRLF line ends, the way
 * spreadsheets save it.
 */
export function toCsv(rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  return `﻿${rows.map((row) => row.map(csvField).join(',')).join('\r\n')}\r\n`;
}

/** The template: the columns and one invented example row to copy. */
export function importTemplateCsv(): string {
  const example: Record<(typeof IMPORT_COLUMNS)[number], string> = {
    sku: 'BAL-900',
    slug: 'balon-de-ejemplo-5',
    nombre: 'Balón de ejemplo #5',
    marca: 'Marca de ejemplo',
    categoria: 'balones',
    subcategoria: 'balones-futbol',
    deportes: 'futbol',
    publico: 'unisex',
    descripcion_corta: 'Borra esta fila y escribe tus productos, uno por fila.',
    personalizable: 'no',
    tecnicas: '',
    tallas: '4|5',
    colores: 'Blanco/Negro',
    destacado: 'no',
    estado: 'borrador',
    origen: '',
    url_anterior: '',
  };
  return toCsv([[...IMPORT_COLUMNS], IMPORT_COLUMNS.map((column) => example[column])]);
}
