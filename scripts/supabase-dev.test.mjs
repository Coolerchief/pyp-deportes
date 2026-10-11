import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkLinkedProject } from './supabase-dev.mjs';

const DEV = 'devdevdevdevdevdevde';
const PROD = 'prodprodprodprodprod';

describe('checkLinkedProject', () => {
  it('allows the linked dev project', () => {
    assert.equal(checkLinkedProject({ devRef: DEV, prodRef: PROD, linkedRef: DEV }), null);
  });

  it('refuses the production project', () => {
    assert.match(checkLinkedProject({ devRef: DEV, prodRef: PROD, linkedRef: PROD }), /PRODUCCIÓN/);
  });

  it('refuses any project other than dev', () => {
    const other = 'otherotherotherother';
    assert.match(
      checkLinkedProject({ devRef: DEV, prodRef: '', linkedRef: other }),
      /no es pyp-dev/,
    );
  });

  it('refuses when dev and prod refs are the same', () => {
    assert.match(checkLinkedProject({ devRef: DEV, prodRef: DEV, linkedRef: DEV }), /producción/);
  });

  it('asks to link when nothing is linked', () => {
    assert.match(checkLinkedProject({ devRef: DEV, prodRef: '', linkedRef: '' }), /db:link/);
  });

  it('requires a well-formed dev ref', () => {
    assert.match(checkLinkedProject({ devRef: '', prodRef: '', linkedRef: DEV }), /Falta/);
    assert.match(checkLinkedProject({ devRef: 'pyp-dev', prodRef: '', linkedRef: DEV }), /válida/);
  });
});
