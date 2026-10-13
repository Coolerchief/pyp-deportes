import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { BUILD_VIEW_NAMES, BUILD_VIEWS, type RawBuildRows } from '@pyp/shared';

const PAGE_SIZE = 1000; // Supabase's default max_rows per request

/** A saved copy of the public_* views (see scripts/snapshot-build-data.mjs). */
export type BuildDataSnapshot = { source: string; takenAt: string; views: RawBuildRows };

type Env = Record<string, string | undefined>;

/**
 * Where the build reads the public views from:
 *   · BUILD_DATA_FILE → a snapshot file (CI and E2E: no database there).
 *   · otherwise Supabase's REST API with NEXT_PUBLIC_SUPABASE_URL and the anon key (local build
 *     against pyp-dev, deploy against production). The anon key only reaches public_* views.
 */
export async function loadRawViews(env: Env = process.env): Promise<RawBuildRows> {
  const file = env.BUILD_DATA_FILE?.trim();
  if (file) return readSnapshot(isAbsolute(file) ? file : resolve(process.cwd(), file));

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'El build necesita leer el catálogo: define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
        '(en .env.local para pyp-dev) o BUILD_DATA_FILE con una copia de las vistas.',
    );
  }
  const entries = await Promise.all(
    BUILD_VIEW_NAMES.map(
      async (view) => [view, await fetchView(url, key, view, BUILD_VIEWS[view].order)] as const,
    ),
  );
  return Object.fromEntries(entries) as RawBuildRows;
}

async function readSnapshot(path: string): Promise<RawBuildRows> {
  let snapshot: BuildDataSnapshot;
  try {
    snapshot = JSON.parse(await readFile(path, 'utf8')) as BuildDataSnapshot;
  } catch (error) {
    throw new Error(`No se pudo leer BUILD_DATA_FILE (${path}): ${(error as Error).message}`);
  }
  return snapshot.views;
}

async function fetchView(url: string, key: string, view: string, order: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const response = await fetch(`${url}/rest/v1/${view}?select=*&order=${order}`, {
      headers: { apikey: key, Range: `${from}-${from + PAGE_SIZE - 1}`, 'Range-Unit': 'items' },
    });
    if (!response.ok) {
      throw new Error(`No se pudo leer ${view} de Supabase (HTTP ${response.status}).`);
    }
    const batch = (await response.json()) as unknown[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}
