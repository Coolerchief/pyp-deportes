'use client';

import type { CatalogJson } from '@pyp/shared';
import { useCallback, useEffect, useState } from 'react';

// catalog.json in the browser (APP-FLOW §3.2): downloaded the first time a visitor filters,
// sorts or loads more, then kept in memory for the rest of the visit.

const CATALOG_URL = '/data/catalog.json';

let request: Promise<CatalogJson> | undefined;

export function loadCatalog(): Promise<CatalogJson> {
  request ??= fetch(CATALOG_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<CatalogJson>;
    })
    .catch((error: unknown) => {
      request = undefined; // a later retry downloads it again
      throw error;
    });
  return request;
}

/** Test hook: forget the downloaded catalog. */
export function resetCatalogCache() {
  request = undefined;
}

export type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Downloads catalog.json once `needed` turns true; `retry` tries again after an error. */
export function useCatalog(needed: boolean) {
  const [catalog, setCatalog] = useState<CatalogJson | null>(null);
  const [status, setStatus] = useState<CatalogStatus>('idle');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!needed || catalog) return;
    let active = true;
    // Async on purpose: the effect only subscribes to the download.
    void Promise.resolve().then(() => active && setStatus('loading'));
    loadCatalog().then(
      (data) => {
        if (!active) return;
        setCatalog(data);
        setStatus('ready');
      },
      () => active && setStatus('error'),
    );
    return () => {
      active = false;
    };
  }, [needed, catalog, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { catalog, status: catalog ? 'ready' : status, retry } as const;
}
