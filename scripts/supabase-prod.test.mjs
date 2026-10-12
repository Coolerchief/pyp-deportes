import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkProductionEnv,
  migrationVersions,
  missingMigrations,
  readAdmin,
} from './supabase-prod.mjs';

const PROD = 'prodprodprodprodprod';
const POOLER = `postgresql://postgres.${PROD}:s3cr%40t@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
const ENV = {
  GITHUB_ACTIONS: 'true',
  SUPABASE_PROD_PROJECT_REF: PROD,
  SUPABASE_PROD_DB_URL: POOLER,
};

describe('checkProductionEnv', () => {
  it('accepts the session pooler URL of the production ref in GitHub Actions', () => {
    assert.equal(checkProductionEnv(ENV), null);
  });

  it('accepts the direct connection host of the production ref', () => {
    const url = `postgresql://postgres:pw@db.${PROD}.supabase.co:5432/postgres`;
    assert.equal(checkProductionEnv({ ...ENV, SUPABASE_PROD_DB_URL: url }), null);
  });

  it('refuses to run outside GitHub Actions', () => {
    assert.match(checkProductionEnv({ ...ENV, GITHUB_ACTIONS: undefined }), /GitHub Actions/);
  });

  it('refuses a URL of another project', () => {
    const url = POOLER.replace(PROD, 'devdevdevdevdevdevde');
    assert.match(checkProductionEnv({ ...ENV, SUPABASE_PROD_DB_URL: url }), /no apunta/);
  });

  it('requires the ref, a valid URL and its password', () => {
    assert.match(checkProductionEnv({ ...ENV, SUPABASE_PROD_PROJECT_REF: '' }), /Falta/);
    assert.match(checkProductionEnv({ ...ENV, SUPABASE_PROD_PROJECT_REF: 'pyp' }), /válida/);
    assert.match(checkProductionEnv({ ...ENV, SUPABASE_PROD_DB_URL: '' }), /Falta/);
    assert.match(checkProductionEnv({ ...ENV, SUPABASE_PROD_DB_URL: 'no es url' }), /válida/);
    assert.match(
      checkProductionEnv({ ...ENV, SUPABASE_PROD_DB_URL: POOLER.replace(':s3cr%40t', '') }),
      /contraseña/,
    );
    assert.match(
      checkProductionEnv({ ...ENV, SUPABASE_PROD_DB_URL: POOLER.replace('postgresql', 'https') }),
      /postgresql/,
    );
  });
});

describe('migrations', () => {
  it('reads sorted versions and ignores other files', () => {
    assert.deepEqual(
      migrationVersions(['20261011130000_b.sql', 'README.md', '20261011120000_a.sql', 'x.sql']),
      ['20261011120000', '20261011130000'],
    );
  });

  it('lists the versions the database has not applied', () => {
    assert.deepEqual(missingMigrations(['1', '2', '3'], ['1', '3']), ['2']);
    assert.deepEqual(missingMigrations(['1'], ['1', '9']), []);
  });
});

describe('readAdmin', () => {
  it('normalizes the email and defaults the name', () => {
    assert.deepEqual(
      readAdmin({
        SUPABASE_PROD_ADMIN_EMAIL: ' Dueno@Ejemplo.MX ',
        SUPABASE_PROD_ADMIN_PASSWORD: 'x'.repeat(12),
      }),
      { admin: { email: 'dueno@ejemplo.mx', password: 'x'.repeat(12), fullName: 'Administrador' } },
    );
  });

  it('allows no admin secrets (the step then needs an existing admin)', () => {
    assert.deepEqual(readAdmin({}), { admin: null });
  });

  it('rejects a bad email or a short password', () => {
    assert.match(readAdmin({ SUPABASE_PROD_ADMIN_EMAIL: 'dueno' }).error, /correo/);
    assert.match(
      readAdmin({ SUPABASE_PROD_ADMIN_EMAIL: 'a@b.mx', SUPABASE_PROD_ADMIN_PASSWORD: 'corta' })
        .error,
      /12 caracteres/,
    );
  });
});
