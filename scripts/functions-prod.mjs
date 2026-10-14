#!/usr/bin/env node
// Edge Function secrets and checks for the production project, run only by
// .github/workflows/functions-production.yml. Production is never linked (CLAUDE.md, rule 8):
// every CLI call names the project with --project-ref. Refuses to run outside GitHub Actions.
//
//   secrets  TURNSTILE_SECRET_KEY must already exist (it is loaded by hand, never through the
//            repository); IP_HASH_SALT is created once if missing; ALLOWED_ORIGINS is set from
//            PROD_ALLOWED_ORIGINS
//   verify   the deployed submit-quote answers CORS for each origin and rejects a request
//            without a Turnstile token (403): deployed, secrets in place, nothing saved
//
// Actions logs are public: this script prints secret names only, never values.

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REF_PATTERN = /^[a-z0-9]{20}$/;

/** Error message in Spanish, or null when the environment is the expected one. */
export function checkFunctionsEnv(env) {
  if (env.GITHUB_ACTIONS !== 'true') {
    return 'Este script solo corre en GitHub Actions (functions-production.yml).';
  }
  const ref = env.SUPABASE_PROD_PROJECT_REF?.trim() || '';
  if (!ref) return 'Falta el secreto SUPABASE_PROD_PROJECT_REF.';
  if (!REF_PATTERN.test(ref)) return 'SUPABASE_PROD_PROJECT_REF no parece una referencia válida.';
  if (!env.SUPABASE_ACCESS_TOKEN?.trim()) return 'Falta el secreto SUPABASE_ACCESS_TOKEN.';
  return null;
}

/** Names in the output of `supabase secrets list -o json` (values are digests, never used). */
export function secretNames(output) {
  return [...String(output).matchAll(/"name"\s*:\s*"([A-Z0-9_]+)"/g)].map((m) => m[1]);
}

/**
 * "https://a.workers.dev, https://b.com" → normalized list. Only https origins (no path), so a
 * typo cannot open CORS to something unexpected. Returns { origins } or { error }.
 */
export function parseOrigins(value) {
  const origins = String(value ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (origins.length === 0) return { error: 'Falta la lista de orígenes permitidos.' };
  for (const origin of origins) {
    let url;
    try {
      url = new URL(origin);
    } catch {
      return { error: `Origen inválido: ${origin}` };
    }
    if (url.protocol !== 'https:' || url.origin !== origin) {
      return { error: `Origen inválido (solo https://dominio, sin ruta): ${origin}` };
    }
  }
  return { origins };
}

/** The env file of the secrets to set; the salt only when it does not exist yet. */
export function secretsToSet({ existing, origins, salt }) {
  const lines = [`ALLOWED_ORIGINS=${origins.join(',')}`];
  if (!existing.includes('IP_HASH_SALT')) lines.push(`IP_HASH_SALT=${salt}`);
  return lines.join('\n');
}

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function supabase(args, { capture = false } = {}) {
  const result = spawnSync('supabase', args, {
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`supabase ${args[0]} ${args[1] ?? ''} falló.`);
  return result.stdout;
}

const commands = {
  secrets(env) {
    const ref = env.SUPABASE_PROD_PROJECT_REF.trim();
    const parsed = parseOrigins(env.PROD_ALLOWED_ORIGINS);
    if (parsed.error) fail(parsed.error);
    const existing = secretNames(
      supabase(['secrets', 'list', '--project-ref', ref, '-o', 'json'], { capture: true }),
    );
    if (!existing.includes('TURNSTILE_SECRET_KEY')) {
      fail(
        'Falta TURNSTILE_SECRET_KEY en las Edge Functions de producción. Cárgala en el dashboard de Supabase (Edge Functions → Secrets) y vuelve a correr.',
      );
    }
    console.log('✓ TURNSTILE_SECRET_KEY existe.');
    const dir = mkdtempSync(join(tmpdir(), 'pyp-prod-secrets-'));
    try {
      const file = join(dir, 'functions.env');
      const salt = randomBytes(32).toString('hex');
      writeFileSync(file, secretsToSet({ existing, origins: parsed.origins, salt }), {
        mode: 0o600,
      });
      supabase(['secrets', 'set', '--project-ref', ref, '--env-file', file]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    console.log(
      existing.includes('IP_HASH_SALT')
        ? '✓ IP_HASH_SALT ya existía; no se cambió.'
        : '✓ IP_HASH_SALT creada (aleatoria, nadie la ve).',
    );
    console.log(`✓ ALLOWED_ORIGINS: ${parsed.origins.join(', ')}`);
  },

  async verify(env) {
    const ref = env.SUPABASE_PROD_PROJECT_REF.trim();
    const { origins, error } = parseOrigins(env.PROD_ALLOWED_ORIGINS);
    if (error) fail(error);
    const url = `https://${ref}.supabase.co/functions/v1/submit-quote`;
    const problems = [];
    for (const origin of origins) {
      const preflight = await fetch(url, {
        method: 'OPTIONS',
        headers: { origin, 'access-control-request-method': 'POST' },
      });
      const allowed = preflight.headers.get('access-control-allow-origin');
      if (preflight.status !== 204 || allowed !== origin) {
        problems.push(`CORS de ${origin}: ${preflight.status}, permite "${allowed ?? ''}".`);
      } else console.log(`✓ CORS permite ${origin}.`);
    }
    // No token: Turnstile rejects it before anything is read or saved. A 500 here means a
    // missing secret.
    const post = await fetch(url, {
      method: 'POST',
      headers: { origin: origins[0], 'content-type': 'application/json' },
      body: JSON.stringify({ turnstileToken: '' }),
    });
    const body = await post.json().catch(() => ({}));
    if (post.status !== 403 || body.error !== 'turnstile_failed') {
      problems.push(`Un envío sin token debía dar 403 turnstile_failed y dio ${post.status}.`);
    } else console.log('✓ Sin token de Turnstile responde 403 (secretos cargados, nada guardado).');
    if (problems.length) fail(`submit-quote no quedó bien:\n  - ${problems.join('\n  - ')}`);
    console.log('\n✓ submit-quote lista en producción.');
  },
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const [name] = process.argv.slice(2);
  const command = commands[name];
  if (!command)
    fail(`Comando desconocido "${name ?? ''}". Usa: ${Object.keys(commands).join(', ')}.`);
  const error = checkFunctionsEnv(process.env);
  if (error) fail(error);
  await command(process.env);
}
