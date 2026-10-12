import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeTap } from './pgtap.mjs';

describe('summarizeTap', () => {
  it('passes when every planned test is ok', () => {
    const summary = summarizeTap(['1..2', 'ok 1 - a', 'ok 2 - b']);
    assert.equal(summary.ok, true);
    assert.equal(summary.ran, 2);
  });

  it('fails on a not ok line', () => {
    const summary = summarizeTap(['1..2', 'ok 1 - a', 'not ok 2 - b', '# Failed test 2']);
    assert.equal(summary.ok, false);
    assert.deepEqual(summary.failed, ['not ok 2 - b']);
  });

  it('ignores failures marked TODO', () => {
    assert.equal(summarizeTap(['1..1', 'not ok 1 - a # TODO later']).ok, true);
  });

  it('fails when fewer tests ran than planned', () => {
    assert.match(summarizeTap(['1..3', 'ok 1 - a']).problems.join(), /planearon 3 y corrieron 1/);
  });

  it('fails without a plan', () => {
    assert.equal(summarizeTap(['ok 1 - a']).ok, false);
  });
});
