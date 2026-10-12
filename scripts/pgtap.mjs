// Minimal pg_prove replacement for no-Docker mode: runs each supabase/tests/**/*.sql file
// over one connection and checks its TAP output. Every test file must be a self-contained
// transaction (begin … rollback), so running it against pyp-dev leaves no data behind.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import pg from 'pg';

/** Lists .sql test files under a directory, sorted so numbered files run in order. */
export function findTestFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

/** Turns TAP lines into a verdict: every planned test ran and none failed. */
export function summarizeTap(lines) {
  const plan = lines.map((line) => line.match(/^1\.\.(\d+)/)).find(Boolean);
  const results = lines.filter((line) => /^(not )?ok\b/.test(line));
  const failed = results.filter((line) => line.startsWith('not ok') && !/#\s*TODO/i.test(line));
  const planned = plan ? Number(plan[1]) : null;
  const problems = [];
  if (planned === null) problems.push('sin plan (falta select plan(n))');
  else if (planned !== results.length)
    problems.push(`se planearon ${planned} y corrieron ${results.length}`);
  if (failed.length) problems.push(`${failed.length} fallaron`);
  return { planned, ran: results.length, failed, ok: problems.length === 0, problems };
}

/** Collects the text rows of every statement result (pgTAP returns one text column). */
function tapLines(results) {
  return (Array.isArray(results) ? results : [results])
    .flatMap((result) => result.rows ?? [])
    .flatMap((row) => Object.values(row).map(String))
    .flatMap((value) => value.split('\n'));
}

export async function runPgTap({ connectionString, password, testsDir, root }) {
  const files = findTestFiles(testsDir);
  if (files.length === 0) {
    console.log('No hay pruebas en supabase/tests.');
    return true;
  }
  // The Supabase pooler presents a certificate from Supabase's own CA: encrypt without verifying.
  // pg ignores a separate `password` option when given a connection string, so it goes in the URL.
  const url = new URL(connectionString);
  url.password = password;
  const client = new pg.Client({ connectionString: url.href, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let allOk = true;
  try {
    for (const file of files) {
      const name = relative(root, file);
      let summary;
      try {
        const lines = tapLines(await client.query(readFileSync(file, 'utf8')));
        summary = summarizeTap(lines);
        for (const line of summary.failed) console.log(`    ${line}`);
        for (const line of lines.filter((l) => l.startsWith('#'))) console.log(`    ${line}`);
      } catch (error) {
        await client.query('rollback').catch(() => {});
        summary = {
          ok: false,
          ran: 0,
          planned: null,
          problems: [`error de SQL: ${error.message}`],
        };
      }
      const detail = summary.ok ? `${summary.ran} pruebas` : summary.problems.join('; ');
      console.log(`${summary.ok ? '✓' : '✖'} ${name} (${detail})`);
      allOk &&= summary.ok;
    }
  } finally {
    await client.end();
  }
  return allOk;
}
