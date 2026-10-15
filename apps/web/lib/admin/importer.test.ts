import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCsv, toImportRows } from '@pyp/shared';
import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import {
  errorsCsv,
  existingSkus,
  ImportBatchError,
  ImportFileError,
  previewRows,
  readImportFile,
  runImport,
} from './importer';

const CSV = readFileSync(resolve(process.cwd(), '../../docs/data/catalogo-inicial.csv'), 'utf8');
const HEADER = parseCsv(CSV)[0]!;

/** A table with the template header and these rows (missing cells are blank). */
function table(...rows: Record<string, string>[]): string[][] {
  return [HEADER, ...rows.map((row) => HEADER.map((column) => row[column] ?? ''))];
}

const good = {
  sku: 'BAL-900',
  slug: 'balon-900',
  nombre: 'Balón 900',
  marca: 'Molten',
  categoria: 'balones',
  tallas: '4|5',
  estado: 'publicado',
};

describe('readImportFile', () => {
  it('reads the initial catalog CSV as the script does', async () => {
    const file = new File([CSV], 'catalogo-inicial.csv', { type: 'text/csv' });
    const read = await readImportFile(file);
    expect(toImportRows(read)).toEqual(toImportRows(parseCsv(CSV)));
    expect(read).toHaveLength(57);
  });

  it('reads the first sheet of an Excel file into the same table', async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(parseCsv(CSV)), 'Productos');
    const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const file = new File([bytes], 'catalogo.xlsx');
    expect(toImportRows(await readImportFile(file))).toEqual(toImportRows(parseCsv(CSV)));
  });

  it('refuses big files and other formats', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.csv');
    await expect(readImportFile(big)).rejects.toThrow(/5 MB/);
    await expect(
      readImportFile(new File(['x'], 'foto.png', { type: 'image/png' })),
    ).rejects.toThrow(ImportFileError);
    // A text file named .xlsx is read as a table; the preview then asks for the columns.
    const fake = await readImportFile(new File(['no es excel'], 'roto.xlsx'));
    expect(() => previewRows(fake, new Set())).toThrow(/le faltan columnas/);
  });
});

describe('previewRows', () => {
  it('splits the initial catalog: 56 valid rows', () => {
    const preview = previewRows(parseCsv(CSV), new Set(['BAL-001']));
    expect(preview.valid).toHaveLength(56);
    expect(preview.invalid).toHaveLength(0);
    expect(preview.valid.find((r) => r.sku === 'BAL-001')?.exists).toBe(true);
    expect(preview.valid.find((r) => r.sku === 'BAL-002')?.exists).toBe(false);
  });

  it('explains each row with errors, repeated SKUs included', () => {
    const preview = previewRows(
      table(
        good,
        { ...good, slug: 'Con Espacios', estado: 'listo' },
        { ...good, slug: 'otro' },
        { ...good, sku: '', nombre: '' },
      ),
      new Set(),
    );
    expect(preview.valid.map((r) => r.line)).toEqual([2]);
    expect(preview.invalid.map((r) => [r.line, r.messages])).toEqual([
      [
        3,
        [
          'El slug solo puede tener minúsculas, números y guiones.',
          'estado debe ser borrador, publicado o archivado.',
          'El SKU se repite: ya está en la fila 2.',
        ],
      ],
      [4, ['El SKU se repite: ya está en la fila 2.']],
      [5, ['Falta el SKU.', 'Falta el nombre.']],
    ]);
  });

  it('stops at a file without the template columns or without rows', () => {
    expect(() =>
      previewRows(
        [
          ['sku', 'nombre'],
          ['A', 'B'],
        ],
        new Set(),
      ),
    ).toThrow(/le faltan columnas de la plantilla: slug/);
    expect(() => previewRows([HEADER], new Set())).toThrow(/no tiene filas/);
  });
});

describe('existingSkus', () => {
  it('asks which SKUs exist, 100 at a time', async () => {
    const calls: string[][] = [];
    const supabase = {
      from: () => ({
        select: () => ({
          in: async (_column: string, skus: string[]) => {
            calls.push(skus);
            return { data: skus.includes('BAL-001') ? [{ sku: 'BAL-001' }] : [], error: null };
          },
        }),
      }),
    };
    const rows = Array.from({ length: 150 }, (_, i) => ({
      ...good,
      sku: i ? `S-${i}` : 'BAL-001',
    }));
    expect(await existingSkus(supabase as never, table(...rows))).toEqual(new Set(['BAL-001']));
    expect(calls.map((c) => c.length)).toEqual([100, 50]);
  });
});

describe('runImport', () => {
  const rows = toImportRows(parseCsv(CSV));
  const ok = (created: number) => ({
    data: { created, updated: 0, errors: [], warnings: [] },
    error: null,
  });

  it('sends the same rows as the script, 50 at a time', async () => {
    const rpc = vi.fn(async (_fn: string, args: { rows: unknown[] }) => ok(args.rows.length));
    const progress: number[] = [];
    const result = await runImport({ rpc } as never, rows, {
      onProgress: (p) => progress.push(p.batch),
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[0]![0]).toBe('admin_import_products');
    expect(rpc.mock.calls[0]![1].rows).toEqual(rows.slice(0, 50));
    expect(rpc.mock.calls[1]![1].rows).toEqual(rows.slice(50));
    expect(result.created).toBe(56);
    expect(progress).toEqual([1, 2]);
  });

  it('stops at a batch that cannot be sent and continues from it', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce(ok(50))
      .mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } });
    const failure = await runImport({ rpc } as never, rows).catch((e: ImportBatchError) => e);
    expect(failure).toBeInstanceOf(ImportBatchError);
    expect((failure as ImportBatchError).failedBatch).toBe(1);
    expect((failure as ImportBatchError).done.created).toBe(50);

    const resume = vi.fn().mockResolvedValueOnce(ok(6));
    const result = await runImport({ rpc: resume } as never, rows, {
      from: 1,
      previous: (failure as ImportBatchError).done,
    });
    expect(resume).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(56);
  });
});

describe('errorsCsv', () => {
  it('joins the preview errors and the database ones, by line', () => {
    const preview = previewRows(table(good, { ...good, sku: '' }), new Set());
    const csv = errorsCsv(preview.invalid, {
      created: 0,
      updated: 0,
      errors: [{ row: 2, sku: 'BAL-900', message: 'La subcategoría no pertenece.' }],
      warnings: [],
    });
    expect(parseCsv(csv)).toEqual([
      ['fila', 'sku', 'motivo'],
      ['2', 'BAL-900', 'La subcategoría no pertenece.'],
      ['3', '', 'Falta el SKU.'],
    ]);
  });
});
