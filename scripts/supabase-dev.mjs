#!/usr/bin/env node
// Runs Supabase CLI database commands against the remote development project (pyp-dev).
// No-Docker mode: there is no local database, so every command uses --linked, and this
// guard refuses to run unless the linked project is the one in SUPABASE_DEV_PROJECT_REF.
// The production project must never be linked from a developer machine.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = resolve(root, 'node_modules/supabase/dist/supabase.js');
const linkedRefFile = resolve(root, 'supabase/.temp/project-ref');
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
  // Re-applies every migration and seed.sql on pyp-dev (destructive: wipes its data).
  reset(env, args) {
    guard(env);
    supabase(['db', 'reset', '--linked', ...args]);
  },
  types(env) {
    guard(env);
    const types = supabase(['gen', 'types', 'typescript', '--linked', '--schema', 'public'], {
      capture: true,
    });
    writeFileSync(typesFile, types);
    console.log(`✓ Tipos escritos en ${typesFile}`);
  },
  test(env, args) {
    guard(env);
    supabase(['test', 'db', '--linked', ...args]);
  },
  // CSV importer (T1.5) runs admin_import_products on pyp-dev through the linked CLI.
  async import(env, args) {
    guard(env);
    const importer = resolve(root, 'scripts/import-catalog.mjs');
    if (!existsSync(importer))
      fail('El importador llega con la tarea T1.5 (scripts/import-catalog.mjs).');
    const { importCatalog } = await import(pathToFileURL(importer).href);
    await importCatalog({ args, supabase });
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
