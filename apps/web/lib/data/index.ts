// Build data (T2.1): public_* views read once per build process, validated with the schemas of
// @pyp/shared and turned into catalog.json and settings.json. Pages and the /data/*.json routes
// call getBuildData(); any invalid row fails the build with the view and the row id.

import {
  buildCatalog,
  type BuildRows,
  buildSettings,
  type CatalogJson,
  type SettingsJson,
  validateBuildRows,
} from '@pyp/shared';
import { loadRawViews } from './source';

export type BuildData = { rows: BuildRows; catalog: CatalogJson; settings: SettingsJson };

let cached: Promise<BuildData> | undefined;

export function getBuildData(): Promise<BuildData> {
  cached ??= loadBuildData();
  return cached;
}

export async function loadBuildData(env?: Record<string, string | undefined>): Promise<BuildData> {
  const rows = validateBuildRows(await loadRawViews(env));
  const generatedAt = new Date().toISOString();
  return {
    rows,
    catalog: buildCatalog(rows, generatedAt),
    settings: buildSettings(rows, generatedAt),
  };
}
