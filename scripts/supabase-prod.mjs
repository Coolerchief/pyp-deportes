#!/usr/bin/env node
// Production database steps for T1.8, run only by .github/workflows/db-production.yml.
// The production project is never linked (CLAUDE.md, rule 8): migrations go with
// `supabase db push --db-url`, and these steps connect with the same secret URL. This script
// refuses to run outside GitHub Actions, so it cannot touch production from a developer machine.
//
//   check   environment and connection
//   seed    supabase/seeds/base.sql, once (skipped when settings already has rows)
//   auth    turns off public sign-up in Auth (Management API)
//   admin   first admin: Auth user + staff_members row (never changes an existing password)
//   verify  migrations applied, anon reads no base table, RLS everywhere, seed and admin present
//
// The repository is public and so are its Actions logs: nothing here prints secrets, the
// admin's email or the connection string.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = resolve(root, 'supabase/migrations');
const baseSeedFile = resolve(root, 'supabase/seeds/base.sql');

const REF_PATTERN = /^[a-z0-9]{20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

/**
 * Checks that the script runs in GitHub Actions and that the connection string belongs to the
 * production project ref. Returns an error message in Spanish, or null when it is safe.
 */
export function checkProductionEnv(env) {
  if (env.GITHUB_ACTIONS !== 'true') {
    return 'Este script solo corre en GitHub Actions (db-production.yml). Producción nunca se toca desde una máquina de desarrollo.';
  }
  const ref = env.SUPABASE_PROD_PROJECT_REF?.trim() || '';
  if (!ref) return 'Falta el secreto SUPABASE_PROD_PROJECT_REF.';
  if (!REF_PATTERN.test(ref))
    return 'SUPABASE_PROD_PROJECT_REF no parece una referencia de proyecto válida.';
  const rawUrl = env.SUPABASE_PROD_DB_URL?.trim() || '';
  if (!rawUrl) return 'Falta el secreto SUPABASE_PROD_DB_URL.';
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'SUPABASE_PROD_DB_URL no es una cadena de conexión válida (¿la contraseña lleva caracteres sin codificar?).';
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    return 'SUPABASE_PROD_DB_URL debe empezar con postgresql://.';
  }
  if (!url.password) return 'SUPABASE_PROD_DB_URL no trae la contraseña de la base.';
  // Session pooler: user postgres.<ref>. Direct connection: host db.<ref>.supabase.co.
  const user = decodeURIComponent(url.username);
  if (user !== `postgres.${ref}` && url.hostname !== `db.${ref}.supabase.co`) {
    return 'SUPABASE_PROD_DB_URL no apunta al proyecto de SUPABASE_PROD_PROJECT_REF.';
  }
  return null;
}

/** Migration versions (the 14-digit prefix) of the files in supabase/migrations, sorted. */
export function migrationVersions(fileNames) {
  return fileNames
    .map((name) => /^(\d{14})_.+\.sql$/.exec(name)?.[1])
    .filter(Boolean)
    .sort();
}

/** Versions in the repository that the database has not applied. */
export function missingMigrations(repoVersions, appliedVersions) {
  const applied = new Set(appliedVersions);
  return repoVersions.filter((version) => !applied.has(version));
}

/**
 * Reads the first admin from the environment. Returns { admin } or { error }; admin is null when
 * no email was given (allowed only if the database already has an active admin).
 */
export function readAdmin(env) {
  const email = env.SUPABASE_PROD_ADMIN_EMAIL?.trim().toLowerCase() || '';
  const password = env.SUPABASE_PROD_ADMIN_PASSWORD || '';
  const fullName = env.SUPABASE_PROD_ADMIN_NAME?.trim() || 'Administrador';
  if (!email) return { admin: null };
  if (!EMAIL_PATTERN.test(email))
    return { error: 'SUPABASE_PROD_ADMIN_EMAIL no es un correo válido.' };
  if (password && password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return {
      error: `SUPABASE_PROD_ADMIN_PASSWORD debe tener al menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  return { admin: { email, password, fullName } };
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** pg options for the secret URL. Supabase's certificate comes from its own CA: encrypt without verifying. */
function connectionOptions(rawUrl) {
  const url = new URL(rawUrl.trim());
  url.searchParams.delete('sslmode');
  return { connectionString: url.href, ssl: { rejectUnauthorized: false } };
}

async function withClient(callback) {
  const client = new pg.Client(connectionOptions(process.env.SUPABASE_PROD_DB_URL));
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function inTransaction(client, callback) {
  await client.query('begin');
  try {
    const result = await callback();
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function managementApi(path, options = {}) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) fail('Falta el secreto SUPABASE_ACCESS_TOKEN (token personal de Supabase).');
  const ref = process.env.SUPABASE_PROD_PROJECT_REF.trim();
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    fail(`La API de administración de Supabase respondió ${response.status} en ${path}.`);
  }
  return response.json();
}

const commands = {
  async check() {
    await withClient(async (client) => {
      const { rows } = await client.query('select current_setting($1) as version', [
        'server_version',
      ]);
      console.log(`✓ Conexión a producción lista (Postgres ${rows[0].version}).`);
    });
  },

  // Base seed (docs/05-BACKEND-SCHEMA.md §11): everything but the development admin. Products
  // are not seeded. Runs in one transaction and only on an empty settings table, so a second run
  // never overwrites what the business changed in the admin.
  async seed() {
    if (!existsSync(baseSeedFile)) fail('No existe supabase/seeds/base.sql.');
    const sql = readFileSync(baseSeedFile, 'utf8');
    await withClient(async (client) => {
      const { rows } = await client.query('select count(*)::int as n from public.settings');
      if (rows[0].n > 0) {
        console.log('✓ La semilla base ya estaba aplicada; no se toca.');
        return;
      }
      await inTransaction(client, () => client.query(sql));
      console.log(
        '✓ Semilla base aplicada (ajustes, textos, espacios de foto, tienda, taxonomía, marcas).',
      );
    });
  },

  // Staff are invited from the admin panel (invite-staff, T4.x); nobody signs up by themselves.
  async auth() {
    await managementApi('/config/auth', {
      method: 'PATCH',
      body: JSON.stringify({ disable_signup: true }),
    });
    const config = await managementApi('/config/auth');
    if (config.disable_signup !== true) fail('Auth sigue aceptando registros públicos.');
    console.log('✓ Registro público desactivado en Auth.');
  },

  async admin() {
    const { admin, error } = readAdmin(process.env);
    if (error) fail(error);
    await withClient(async (client) => {
      if (!admin) {
        const { rows } = await client.query(
          `select count(*)::int as n from public.staff_members where role = 'admin' and is_active`,
        );
        if (rows[0].n === 0) {
          fail(
            'No hay ningún admin: agrega los secretos SUPABASE_PROD_ADMIN_EMAIL y SUPABASE_PROD_ADMIN_PASSWORD.',
          );
        }
        console.log('✓ Ya hay un admin activo; sin secretos de admin no se cambia nada.');
        return;
      }
      await inTransaction(client, async () => {
        const existing = await client.query('select id from auth.users where email = $1', [
          admin.email,
        ]);
        let userId = existing.rows[0]?.id;
        if (userId) {
          console.log('✓ El usuario del admin ya existía; su contraseña no se cambia.');
        } else {
          if (!admin.password)
            fail('Falta el secreto SUPABASE_PROD_ADMIN_PASSWORD para crear el admin.');
          // Same shape as supabase/seeds/dev-admin.sql: a confirmed email user.
          const created = await client.query(
            `insert into auth.users (
               instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
               raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
               confirmation_token, recovery_token, email_change, email_change_token_new
             ) values (
               '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
               'authenticated', $1, extensions.crypt($2, extensions.gen_salt('bf')), now(),
               '{"provider": "email", "providers": ["email"]}',
               jsonb_build_object('full_name', $3::text), now(), now(), '', '', '', ''
             ) returning id`,
            [admin.email, admin.password, admin.fullName],
          );
          userId = created.rows[0].id;
          await client.query(
            `insert into auth.identities (id, user_id, provider_id, provider, identity_data,
                                          created_at, updated_at)
             values (gen_random_uuid(), $1, $2, 'email',
                     jsonb_build_object('sub', $2::text, 'email', $3::text, 'email_verified', true),
                     now(), now())`,
            [userId, String(userId), admin.email],
          );
          console.log(
            '✓ Usuario del admin creado con la contraseña de SUPABASE_PROD_ADMIN_PASSWORD.',
          );
        }
        await client.query(
          `insert into public.staff_members (user_id, role, full_name)
           values ($1, 'admin', $2)
           on conflict (user_id) do update set role = 'admin', is_active = true`,
          [userId, admin.fullName],
        );
        console.log('✓ El usuario es admin activo en staff_members.');
      });
    });
  },

  // T1.8 "hecho cuando": the remote project has the schema and anon reads no base table.
  async verify() {
    const repoVersions = migrationVersions(readdirSync(migrationsDir));
    const problems = [];
    await withClient(async (client) => {
      const applied = await client.query(
        'select version from supabase_migrations.schema_migrations order by version',
      );
      const missing = missingMigrations(
        repoVersions,
        applied.rows.map((row) => row.version),
      );
      if (missing.length) problems.push(`Migraciones sin aplicar: ${missing.join(', ')}.`);
      else console.log(`✓ Las ${repoVersions.length} migraciones del repositorio están aplicadas.`);

      const anonTables = await client.query(
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind in ('r', 'p')
            and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert')
              or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete'))
          order by 1`,
      );
      if (anonTables.rowCount) {
        problems.push(
          `anon tiene privilegios en: ${anonTables.rows.map((r) => r.relname).join(', ')}.`,
        );
      } else console.log('✓ anon no tiene privilegios en ninguna tabla base de public.');

      const noRls = await client.query(
        `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity order by 1`,
      );
      if (noRls.rowCount) {
        problems.push(`Tablas sin RLS: ${noRls.rows.map((r) => r.relname).join(', ')}.`);
      } else console.log('✓ RLS activo en todas las tablas de public.');

      // Read as anon, the way the public API would.
      await client.query('begin');
      try {
        await client.query('set local role anon');
        await client.query('savepoint base_table');
        try {
          await client.query('select 1 from public.products limit 1');
          problems.push('anon pudo leer public.products.');
        } catch (error) {
          if (error.code !== '42501') throw error;
          await client.query('rollback to savepoint base_table');
          console.log('✓ anon recibe "permission denied" al leer public.products.');
        }
        const settings = await client.query(
          'select count(*)::int as n from public.public_settings',
        );
        if (settings.rows[0].n === 0)
          problems.push('anon no ve ajustes públicos en public_settings.');
        else
          console.log(`✓ anon lee las vistas public_* (${settings.rows[0].n} ajustes públicos).`);
      } finally {
        await client.query('rollback');
      }

      const seed = await client.query(
        `select (select count(*)::int from public.categories) as categories,
                (select count(*)::int from public.brands) as brands,
                (select count(*)::int from public.sports) as sports,
                (select count(*)::int from public.stores) as stores`,
      );
      const counts = seed.rows[0];
      if (!counts.categories || !counts.brands || !counts.sports || !counts.stores) {
        problems.push('Falta la semilla base (categorías, marcas, deportes o tienda).');
      } else {
        console.log(
          `✓ Semilla: ${counts.categories} categorías, ${counts.brands} marcas, ${counts.sports} deportes, ${counts.stores} tienda(s).`,
        );
      }

      const devAdmin = await client.query(
        `select count(*)::int as n from auth.users where email = 'admin@pyp.test'`,
      );
      if (devAdmin.rows[0].n) problems.push('Existe el admin de desarrollo admin@pyp.test.');

      const admins = await client.query(
        `select count(*)::int as n from public.staff_members where role = 'admin' and is_active`,
      );
      if (!admins.rows[0].n) problems.push('No hay ningún admin activo.');
      else console.log(`✓ ${admins.rows[0].n} admin(s) activo(s).`);
    });
    if (problems.length)
      fail(`Producción no quedó como se esperaba:\n  - ${problems.join('\n  - ')}`);
    console.log('\n✓ Producción lista: esquema, semilla, seguridad y admin.');
  },
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const [name] = process.argv.slice(2);
  const command = commands[name];
  if (!command)
    fail(`Comando desconocido "${name ?? ''}". Usa: ${Object.keys(commands).join(', ')}.`);
  const error = checkProductionEnv(process.env);
  if (error) fail(error);
  await command();
}
