#!/usr/bin/env node
// Runs Supabase CLI database commands against the remote development project (pyp-dev).
// No-Docker mode: there is no local database, so every command uses --linked, and this
// guard refuses to run unless the linked project is the one in SUPABASE_DEV_PROJECT_REF.
// The production project must never be linked from a developer machine.

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { runFolioConcurrency } from './folio-concurrency.mjs';
import { importCatalog } from './import-catalog.mjs';
import { runPgTap } from './pgtap.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'node_modules/supabase/dist/supabase.js');
const linkedRefFile = resolve(root, 'supabase/.temp/project-ref');
const poolerUrlFile = resolve(root, 'supabase/.temp/pooler-url');
const typesFile = resolve(root, 'packages/shared/database.types.ts');

const REF_PATTERN = /^[a-z0-9]{20}$/;

/**
 * Decides whether a command may run against the linked project.
 * Returns an error message in Spanish, or null when it is safe.
 */
export function checkLinkedProject({ devRef, prodRef, linkedRef }) {
  if (!devRef) {
    return 'Falta SUPABASE_DEV_PROJECT_REF en .env.local (la referencia de pyp-dev). Copia .env.example.';
  }
  if (!REF_PATTERN.test(devRef)) {
    return `SUPABASE_DEV_PROJECT_REF no parece una referencia de proyecto válida: "${devRef}".`;
  }
  if (prodRef && devRef === prodRef) {
    return 'SUPABASE_DEV_PROJECT_REF es igual a SUPABASE_PROD_PROJECT_REF. Nunca se trabaja contra producción.';
  }
  if (!linkedRef) {
    return 'No hay proyecto enlazado. Corre: pnpm db:link';
  }
  if (prodRef && linkedRef === prodRef) {
    return `El proyecto enlazado (${linkedRef}) es PRODUCCIÓN. Corre "supabase unlink" y luego pnpm db:link.`;
  }
  if (linkedRef !== devRef) {
    return `El proyecto enlazado (${linkedRef}) no es pyp-dev (${devRef}). Corre "supabase unlink" y luego pnpm db:link.`;
  }
  return null;
}

function loadEnv() {
  const envFile = resolve(root, '.env.local');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  return {
    devRef: process.env.SUPABASE_DEV_PROJECT_REF?.trim() || '',
    prodRef: process.env.SUPABASE_PROD_PROJECT_REF?.trim() || '',
  };
}

function readLinkedRef() {
  return existsSync(linkedRefFile) ? readFileSync(linkedRefFile, 'utf8').trim() : '';
}

function supabase(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: options.capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/**
 * Connection to pyp-dev through the session pooler that `supabase link` recorded. The pooler's
 * certificate comes from Supabase's own CA: encrypt without verifying.
 */
function poolerConnection() {
  if (!existsSync(poolerUrlFile))
    fail('Falta supabase/.temp/pooler-url. Vuelve a correr pnpm db:link.');
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) fail('Falta SUPABASE_DB_PASSWORD en .env.local.');
  const url = new URL(readFileSync(poolerUrlFile, 'utf8').trim());
  url.password = password;
  return { connectionString: url.href, ssl: { rejectUnauthorized: false } };
}

const DEV_ADMIN_EMAIL = 'admin@pyp.test';

async function setDevAdminPassword() {
  const password = process.env.SUPABASE_DEV_ADMIN_PASSWORD;
  if (!password) {
    console.log(
      `⚠ Sin SUPABASE_DEV_ADMIN_PASSWORD en .env.local: ${DEV_ADMIN_EMAIL} existe pero no puede entrar.`,
    );
    return;
  }
  const client = new pg.Client(poolerConnection());
  await client.connect();
  try {
    const { rowCount } = await client.query(
      `update auth.users set encrypted_password = extensions.crypt($1, extensions.gen_salt('bf'))
        where email = $2`,
      [password, DEV_ADMIN_EMAIL],
    );
    if (rowCount !== 1)
      fail(`No se encontró ${DEV_ADMIN_EMAIL}; ¿corrió supabase/seeds/dev-admin.sql?`);
    console.log(`✓ Contraseña de ${DEV_ADMIN_EMAIL} lista (de SUPABASE_DEV_ADMIN_PASSWORD).`);
  } finally {
    await client.end();
  }
}

/**
 * Cloudflare's public Turnstile test secret that always passes (TRD §9.2): pyp-dev uses it unless
 * DEV_TURNSTILE_SECRET_KEY says otherwise. Production gets its real secret from GitHub.
 */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';
export const DEV_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3100';

/** Secrets of the Edge Functions on pyp-dev, as an env file (values never printed). */
export function devFunctionSecrets(env) {
  return [
    `TURNSTILE_SECRET_KEY=${env.DEV_TURNSTILE_SECRET_KEY || TURNSTILE_TEST_SECRET}`,
    `IP_HASH_SALT=${env.DEV_IP_HASH_SALT}`,
    `ALLOWED_ORIGINS=${env.DEV_ALLOWED_ORIGINS || DEV_ALLOWED_ORIGINS}`,
  ].join('\n');
}

function guard(env) {
  const error = checkLinkedProject({ ...env, linkedRef: readLinkedRef() });
  if (error) fail(error);
  console.log(`→ Proyecto enlazado: pyp-dev (${env.devRef})`);
}

const commands = {
  // Links the CLI to pyp-dev only; the ref comes from .env.local, never from the command line.
  link(env) {
    const error = checkLinkedProject({ ...env, linkedRef: env.devRef });
    if (error) fail(error);
    const linked = readLinkedRef();
    if (linked && linked !== env.devRef) {
      fail(`Ya hay otro proyecto enlazado (${linked}). Corre "supabase unlink" primero.`);
    }
    supabase(['link', '--project-ref', env.devRef]);
  },
  // Re-applies every migration and the seeds (config.toml) on pyp-dev (destructive: wipes its data), then gives
  // the seed's development admin its password from .env.local (never in the public repo).
  async reset(env, args) {
    guard(env);
    supabase(['db', 'reset', '--linked', ...args]);
    await setDevAdminPassword();
  },
  // Gives admin@pyp.test the password of .env.local without resetting pyp-dev.
  async 'admin-password'(env) {
    guard(env);
    await setDevAdminPassword();
  },
  // Applies only the migrations pyp-dev does not have yet; its data stays (no seeds, no wipe).
  migrate(env, args) {
    guard(env);
    supabase(['db', 'push', '--linked', ...args]);
  },
  // One command for a ready development database: reset + seed + initial catalog.
  async setup(env, args) {
    await commands.reset(env, args);
    await commands.import(env, ['docs/data/catalogo-inicial.csv']);
  },
  types(env) {
    guard(env);
    const types = supabase(['gen', 'types', 'typescript', '--linked', '--schema', 'public'], {
      capture: true,
    });
    writeFileSync(typesFile, types);
    console.log(`✓ Tipos escritos en ${typesFile}`);
  },
  // `supabase test db --linked` still needs Docker (pg_prove), so pgTAP runs through
  // scripts/pgtap.mjs over the session pooler that `supabase link` recorded.
  async test(env) {
    guard(env);
    if (!existsSync(poolerUrlFile))
      fail('Falta supabase/.temp/pooler-url. Vuelve a correr pnpm db:link.');
    const password = process.env.SUPABASE_DB_PASSWORD;
    if (!password) fail('Falta SUPABASE_DB_PASSWORD en .env.local.');
    const ok = await runPgTap({
      connectionString: readFileSync(poolerUrlFile, 'utf8').trim(),
      password,
      testsDir: resolve(root, 'supabase/tests'),
      root,
    });
    if (!ok) fail('Hay pruebas pgTAP que fallaron.');
    // Security test 8 needs several connections at once, so it lives outside pgTAP.
    const foliosOk = await runFolioConcurrency(poolerConnection());
    if (!foliosOk) fail('next_folio repitió o saltó folios con llamadas simultáneas.');
  },
  // Deploys the Edge Functions to pyp-dev with their secrets (T3.7). The salt is created once in
  // .env.local; the secrets travel in a temporary file, never on the command line.
  functions(env, args) {
    guard(env);
    if (!process.env.DEV_IP_HASH_SALT) {
      const salt = randomBytes(32).toString('hex');
      appendFileSync(resolve(root, '.env.local'), `\nDEV_IP_HASH_SALT=${salt}\n`);
      process.env.DEV_IP_HASH_SALT = salt;
      console.log('✓ DEV_IP_HASH_SALT creada en .env.local.');
    }
    const dir = mkdtempSync(join(tmpdir(), 'pyp-secrets-'));
    try {
      const file = join(dir, 'functions.env');
      writeFileSync(file, devFunctionSecrets(process.env), { mode: 0o600 });
      supabase(['secrets', 'set', '--project-ref', env.devRef, '--env-file', file]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    const names = args.length > 0 ? args : ['submit-quote'];
    for (const name of names) {
      supabase(['functions', 'deploy', name, '--project-ref', env.devRef, '--use-api']);
    }
  },
  // CSV importer (T1.5): sends the file to admin_import_products on pyp-dev over the pooler.
  async import(env, args) {
    guard(env);
    const [file] = args;
    if (!file) fail('Indica el CSV: pnpm db:import docs/data/catalogo-inicial.csv');
    if (!existsSync(resolve(root, file))) fail(`No existe el archivo ${file}.`);
    const ok = await importCatalog({
      file: resolve(root, file),
      ...poolerConnection(),
    });
    if (!ok) fail('Hay filas con errores; las demás se importaron.');
  },
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const [name, ...args] = process.argv.slice(2);
  const command = commands[name];
  if (!command)
    fail(`Comando desconocido "${name ?? ''}". Usa: ${Object.keys(commands).join(', ')}.`);
  await command(loadEnv(), args);
}
