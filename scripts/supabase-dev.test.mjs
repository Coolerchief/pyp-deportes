import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkLinkedProject, devFunctionSecrets, TURNSTILE_TEST_SECRET } from './supabase-dev.mjs';

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

describe('devFunctionSecrets', () => {
  it('uses the Turnstile test secret and localhost origins unless .env.local says otherwise', () => {
    assert.equal(
      devFunctionSecrets({ DEV_IP_HASH_SALT: 'sal' }),
      `TURNSTILE_SECRET_KEY=${TURNSTILE_TEST_SECRET}\nIP_HASH_SALT=sal\nALLOWED_ORIGINS=http://localhost:3000,http://localhost:3100`,
    );
    assert.match(
      devFunctionSecrets({
        DEV_IP_HASH_SALT: 'sal',
        DEV_TURNSTILE_SECRET_KEY: 'otro',
        DEV_ALLOWED_ORIGINS: 'https://a.test',
      }),
      /^TURNSTILE_SECRET_KEY=otro\n.*\nALLOWED_ORIGINS=https:\/\/a\.test$/s,
    );
  });
});

describe('devFunctionSecrets · R2', () => {
  it('adds the R2 keys of sign-upload only when .env.local has them', () => {
    assert.doesNotMatch(devFunctionSecrets({ DEV_IP_HASH_SALT: 'sal' }), /R2_/);
    const secrets = devFunctionSecrets({
      DEV_IP_HASH_SALT: 'sal',
      DEV_R2_ACCOUNT_ID: 'cuenta',
      DEV_R2_ACCESS_KEY_ID: 'id',
      DEV_R2_SECRET_ACCESS_KEY: 'secreto',
      DEV_R2_BUCKET: 'pyp-media-dev',
    });
    assert.match(
      secrets,
      /\nR2_ACCOUNT_ID=cuenta\nR2_ACCESS_KEY_ID=id\nR2_SECRET_ACCESS_KEY=secreto\nR2_BUCKET=pyp-media-dev$/,
    );
  });
});
