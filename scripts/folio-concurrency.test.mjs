import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkFolios } from './folio-concurrency.mjs';

describe('checkFolios', () => {
  it('accepts unique consecutive folios in any order', () => {
    assert.equal(checkFolios(['PYP-2999-000002', 'PYP-2999-000001'], 2).ok, true);
  });

  it('rejects a repeated folio', () => {
    const result = checkFolios(['PYP-2999-000001', 'PYP-2999-000001'], 2);
    assert.equal(result.ok, false);
    assert.deepEqual(result.duplicates, ['PYP-2999-000001']);
  });

  it('rejects gaps or missing calls', () => {
    assert.equal(checkFolios(['PYP-2999-000001', 'PYP-2999-000003'], 2).ok, false);
    assert.equal(checkFolios(['PYP-2999-000001'], 2).ok, false);
  });
});
