'use client';

import type { CatalogJson } from '@pyp/shared';
import type * as SearchModule from '@pyp/shared/search';
import { useEffect, useMemo, useState } from 'react';
import { useCatalog } from './catalog-client';
import { ROUTES } from './navigation';

/** Same as SEARCH's MIN_QUERY_LENGTH, without loading the search code to read it. */
export const MIN_QUERY_LENGTH = 2;

export type SearchApi = typeof SearchModule;

let moduleRequest: Promise<SearchApi> | undefined;
/** MiniSearch and the search rules load on demand, not with every page. */
function loadSearchModule(): Promise<SearchApi> {
  moduleRequest ??= import('@pyp/shared/search');
  return moduleRequest;
}

/**
 * The search index over catalog.json: the code and the catalog download the first time
 * `needed` is true (focus on the field, or /buscar), then stay for the visit.
 */
export function useCatalogSearch(needed: boolean) {
  const { catalog, status, retry } = useCatalog(needed);
  const [api, setApi] = useState<SearchApi | null>(null);
  useEffect(() => {
    if (!needed || api) return;
    let active = true;
    loadSearchModule().then((loaded) => active && setApi(() => loaded));
    return () => {
      active = false;
    };
  }, [needed, api]);
  const search = useMemo(
    () => (api && catalog ? api.buildCatalogSearch(catalog as CatalogJson) : null),
    [api, catalog],
  );
  return { catalog, api, search, status, retry } as const;
}

/** /buscar?q=… for a query. */
export function searchHref(query: string): string {
  return `${ROUTES.search}?q=${encodeURIComponent(query.trim())}`;
}
