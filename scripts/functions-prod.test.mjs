import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkFunctionsEnv, parseOrigins, secretNames, secretsToSet } from './functions-prod.mjs';

const REF = 'prodprodprodprodprod';

describe('checkFunctionsEnv', () => {
  it('runs only in GitHub Actions with the production ref and an access token', () => {
    const ok = {
      GITHUB_ACTIONS: 'true',
      SUPABASE_PROD_PROJECT_REF: REF,
      SUPABASE_ACCESS_TOKEN: 't',
    };
    assert.equal(checkFunctionsEnv(ok), null);
    assert.match(checkFunctionsEnv({ ...ok, GITHUB_ACTIONS: undefined }), /GitHub Actions/);
    assert.match(checkFunctionsEnv({ ...ok, SUPABASE_PROD_PROJECT_REF: 'x' }), /válida/);
    assert.match(checkFunctionsEnv({ ...ok, SUPABASE_ACCESS_TOKEN: '' }), /ACCESS_TOKEN/);
  });
});

describe('secretNames', () => {
  it('reads the names of `supabase secrets list -o json`, never the values', () => {
    const output = `[
  { "name": "TURNSTILE_SECRET_KEY", "updated_at": "2026-10-14", "value": "abc123" },
  { "name": "SUPABASE_URL", "value": "def456" }
]
A new version of Supabase CLI is available`;
    assert.deepEqual(secretNames(output), ['TURNSTILE_SECRET_KEY', 'SUPABASE_URL']);
  });
});

describe('parseOrigins', () => {
  it('accepts https origins only, without paths', () => {
    assert.deepEqual(
      parseOrigins(' https://pyp-deportes.example.workers.dev/ , https://pypdeportescoapa.com'),
      { origins: ['https://pyp-deportes.example.workers.dev', 'https://pypdeportescoapa.com'] },
    );
    assert.match(parseOrigins('').error, /Falta/);
    assert.match(parseOrigins('http://pypdeportescoapa.com').error, /inválido/);
    assert.match(parseOrigins('https://a.com/cotizacion').error, /inválido/);
    assert.match(parseOrigins('a.com').error, /inválido/);
  });
});

describe('secretsToSet', () => {
  it('creates the salt only once and always sets the origins', () => {
    assert.equal(
      secretsToSet({ existing: ['TURNSTILE_SECRET_KEY'], origins: ['https://a.com'], salt: 's' }),
      'ALLOWED_ORIGINS=https://a.com\nIP_HASH_SALT=s',
    );
    assert.equal(
      secretsToSet({
        existing: ['TURNSTILE_SECRET_KEY', 'IP_HASH_SALT'],
        origins: ['https://a.com', 'https://b.com'],
        salt: 's',
      }),
      'ALLOWED_ORIGINS=https://a.com,https://b.com',
    );
  });
});
