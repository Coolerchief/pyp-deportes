import { describe, expect, it } from 'vitest';
import {
  importTemplateCsv,
  mergeResults,
  missingColumns,
  parseCsv,
  toBatches,
  toCsv,
  toImportRows,
} from './import-file.ts';
import { IMPORT_COLUMNS, ImportRowSchema } from './importer.ts';

describe('parseCsv / toCsv', () => {
  it('reads quotes, commas and line breaks inside quotes, CRLF and the BOM', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","di ""hola""\nadiós"\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'di "hola"\nadiós'],
    ]);
  });

  it('writes what it reads, with a BOM for Excel', () => {
    const rows = [
      ['fila', 'motivo'],
      ['3', 'Falta el SKU, revisa "A1".'],
    ];
    const csv = toCsv(rows);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Falta el SKU, revisa ""A1""."');
    expect(parseCsv(csv)).toEqual(rows);
  });
});

describe('toImportRows / missingColumns', () => {
  it('keys the cells by the header (any case) and adds the line number', () => {
    expect(
      toImportRows([
        ['SKU', ' Nombre '],
        ['BAL-1', ' Balón '],
      ]),
    ).toEqual([{ sku: 'BAL-1', nombre: 'Balón', _row: 2 }]);
  });

  it('lists the template columns the file lacks', () => {
    expect(missingColumns([[...IMPORT_COLUMNS]])).toEqual([]);
    expect(missingColumns([['sku', 'nombre']])).toContain('categoria');
    expect(missingColumns([])).toHaveLength(IMPORT_COLUMNS.length);
  });
});

describe('template', () => {
  it('has every column and an example row that passes the checks', () => {
    const table = parseCsv(importTemplateCsv());
    expect(table[0]).toEqual([...IMPORT_COLUMNS]);
    const [row] = toImportRows(table);
    expect(ImportRowSchema.safeParse(row).success).toBe(true);
  });
});

describe('batches', () => {
  it('cuts in 50 and adds up the results', () => {
    expect(toBatches(Array.from({ length: 101 }, (_, i) => i)).map((b) => b.length)).toEqual([
      50, 50, 1,
    ]);
    expect(
      mergeResults([
        { created: 1, updated: 2, errors: [{ row: 3, sku: 'A', message: 'x' }], warnings: [] },
        { created: 3, updated: 0, errors: [], warnings: [{ row: 9, sku: 'B', message: 'y' }] },
      ]),
    ).toEqual({
      created: 4,
      updated: 2,
      errors: [{ row: 3, sku: 'A', message: 'x' }],
      warnings: [{ row: 9, sku: 'B', message: 'y' }],
    });
  });
});
