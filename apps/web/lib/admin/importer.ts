import {
  type Database,
  IMPORT_BATCH_SIZE,
  type ImportFileRow,
  type ImportResult,
  ImportResultSchema,
  type ImportRow,
  ImportRowSchema,
  mergeResults,
  missingColumns,
  parseCsv,
  toBatches,
  toCsv,
  toImportRows,
} from '@pyp/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

// Catalog importer of the panel (T4.6, APP-FLOW §8.3): read a CSV or XLSX, check every row with
// ImportRowSchema, send the valid ones in batches of 50 to admin_import_products (the same
// function as `pnpm db:import`) and report what happened.

type Client = SupabaseClient<Database>;

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportFileError';
  }
}

const isExcel = (file: File) =>
  /\.xlsx?$/i.test(file.name) ||
  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
  file.type === 'application/vnd.ms-excel';

/** The file as a table of text cells. XLSX goes through SheetJS, loaded only for it. */
export async function readImportFile(file: File): Promise<string[][]> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new ImportFileError('El archivo pesa más de 5 MB. Divídelo en varios archivos.');
  }
  if (isExcel(file)) {
    try {
      const XLSX = await import('xlsx');
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = book.Sheets[book.SheetNames[0] ?? ''];
      if (!sheet) throw new Error('sin hojas');
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: false,
      });
      return rows
        .map((row) => row.map((cell) => String(cell ?? '')))
        .filter((cells) => cells.some((cell) => cell.trim() !== ''));
    } catch {
      throw new ImportFileError('No pudimos leer ese Excel. Guárdalo como .xlsx o como CSV.');
    }
  }
  if (!/\.(csv|txt)$/i.test(file.name) && !/csv|text\/plain/.test(file.type)) {
    throw new ImportFileError('Sube un archivo CSV o Excel (.xlsx).');
  }
  return parseCsv(await file.text());
}

export type PreviewRow =
  | { line: number; sku: string; ok: true; raw: ImportFileRow; row: ImportRow; exists: boolean }
  | { line: number; sku: string; ok: false; raw: ImportFileRow; messages: string[] };

export type ImportPreview = {
  rows: PreviewRow[];
  valid: Extract<PreviewRow, { ok: true }>[];
  invalid: Extract<PreviewRow, { ok: false }>[];
};

/** Rows checked like the database will (plus SKUs repeated in the file). */
export function previewRows(table: string[][], existingSkus: ReadonlySet<string>): ImportPreview {
  const missing = missingColumns(table);
  if (missing.length) {
    throw new ImportFileError(
      `Al archivo le faltan columnas de la plantilla: ${missing.join(', ')}. Descarga la plantilla y copia tus datos en ella.`,
    );
  }
  const raws = toImportRows(table);
  if (raws.length === 0) throw new ImportFileError('El archivo no tiene filas de productos.');
  const firstLine = new Map<string, number>();
  const rows: PreviewRow[] = raws.map((raw) => {
    const sku = (raw.sku ?? '').trim();
    const parsed = ImportRowSchema.safeParse(raw);
    const messages = parsed.success ? [] : [...new Set(parsed.error.issues.map((i) => i.message))];
    const key = sku; // admin_import_products matches SKUs exactly, as written
    const seen = key ? firstLine.get(key) : undefined;
    if (seen !== undefined) messages.push(`El SKU se repite: ya está en la fila ${seen}.`);
    else if (key) firstLine.set(key, raw._row);
    if (!parsed.success || messages.length) {
      return { line: raw._row, sku, ok: false, raw, messages };
    }
    return { line: raw._row, sku, ok: true, raw, row: parsed.data, exists: existingSkus.has(sku) };
  });
  return {
    rows,
    valid: rows.filter((r): r is Extract<PreviewRow, { ok: true }> => r.ok),
    invalid: rows.filter((r): r is Extract<PreviewRow, { ok: false }> => !r.ok),
  };
}

/** SKUs of the file that already exist (they will be updated, not duplicated). */
export async function existingSkus(supabase: Client, table: string[][]): Promise<Set<string>> {
  const skus = [
    ...new Set(
      toImportRows(table)
        .map((r) => (r.sku ?? '').trim())
        .filter(Boolean),
    ),
  ];
  const found = new Set<string>();
  for (const chunk of toBatches(skus, 100)) {
    const { data, error } = await supabase.from('products').select('sku').in('sku', chunk);
    if (error) throw error;
    for (const row of data ?? []) found.add(row.sku);
  }
  return found;
}

export type ImportProgress = { batch: number; batches: number };

export class ImportBatchError extends Error {
  constructor(
    readonly done: ImportResult,
    /** Index of the batch that failed; importing again from it continues where it stopped. */
    readonly failedBatch: number,
  ) {
    super('batch');
    this.name = 'ImportBatchError';
  }
}

/**
 * Sends the rows in batches of 50. Each batch is one transaction; a row with an error is
 * reported and skipped without stopping the rest. A batch that cannot be sent (network) stops
 * the import with what was done so far.
 */
export async function runImport(
  supabase: Client,
  rows: readonly ImportFileRow[],
  options: {
    from?: number;
    previous?: ImportResult;
    onProgress?: (p: ImportProgress) => void;
  } = {},
): Promise<ImportResult> {
  const batches = toBatches(rows, IMPORT_BATCH_SIZE);
  const results: ImportResult[] = options.previous ? [options.previous] : [];
  for (let index = options.from ?? 0; index < batches.length; index += 1) {
    options.onProgress?.({ batch: index + 1, batches: batches.length });
    const { data, error } = await supabase.rpc('admin_import_products', {
      rows: batches[index]! as never,
    });
    const parsed = error ? null : ImportResultSchema.safeParse(data);
    if (!parsed?.success) throw new ImportBatchError(mergeResults(results), index);
    results.push(parsed.data);
  }
  return mergeResults(results);
}

/** "Descargar errores": the rows left out by the preview and the ones the database refused. */
export function errorsCsv(
  preview: readonly Extract<PreviewRow, { ok: false }>[],
  result: ImportResult | null,
): string {
  const lines: (string | number)[][] = [
    ...preview.map((row) => [row.line, row.sku, row.messages.join(' ')]),
    ...(result?.errors ?? []).map((error) => [error.row, error.sku ?? '', error.message]),
  ].sort((a, b) => Number(a[0]) - Number(b[0]));
  return toCsv([['fila', 'sku', 'motivo'], ...lines]);
}

/** Starts the download of a text file made in the browser. */
export function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
