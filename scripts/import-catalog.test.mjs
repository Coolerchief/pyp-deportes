import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { mergeResults, parseCsv, toBatches, toImportRows } from './import-catalog.mjs';

describe('parseCsv', () => {
  it('splits simple rows and ignores blank lines', () => {
    assert.deepEqual(parseCsv('a,b\r\n1,2\n\n3,\n'), [
      ['a', 'b'],
      ['1', '2'],
      ['3', ''],
    ]);
  });

  it('handles quotes, doubled quotes, commas and line breaks inside quotes', () => {
    assert.deepEqual(parseCsv('﻿name,note\n"Balón ""Pro""","rojo, azul\nverde"'), [
      ['name', 'note'],
      ['Balón "Pro"', 'rojo, azul\nverde'],
    ]);
  });
});

describe('toImportRows', () => {
  it('keys cells by header and adds the spreadsheet line number', () => {
    assert.deepEqual(
      toImportRows([
        ['sku', ' nombre '],
        ['BAL-001', ' Balón '],
      ]),
      [{ sku: 'BAL-001', nombre: 'Balón', _row: 2 }],
    );
  });

  it('reads the initial catalog: 56 products with every column', () => {
    const csv = readFileSync(new URL('../docs/data/catalogo-inicial.csv', import.meta.url), 'utf8');
    const rows = toImportRows(parseCsv(csv));
    assert.equal(rows.length, 56);
    assert.equal(new Set(rows.map((row) => row.sku)).size, 56);
    assert.ok(rows.every((row) => Object.keys(row).length === 18));
  });
});

describe('toBatches / mergeResults', () => {
  it('cuts batches of 50', () => {
    assert.deepEqual(
      toBatches(Array.from({ length: 56 }, (_, i) => i)).map((batch) => batch.length),
      [50, 6],
    );
  });

  it('adds up the batch results', () => {
    const total = mergeResults([
      { created: 2, updated: 1, errors: [{ row: 3 }], warnings: [] },
      { created: 0, updated: 4, errors: [], warnings: [{ row: 60 }] },
    ]);
    assert.deepEqual(total, {
      created: 2,
      updated: 5,
      errors: [{ row: 3 }],
      warnings: [{ row: 60 }],
    });
  });
});
