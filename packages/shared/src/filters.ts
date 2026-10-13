// Listing filters (T2.5, TRD §7, APP-FLOW §1 and §3.2): URL parameters, AND between filter
// types and OR inside one, and the counts next to each option, computed in the browser.

import type { CatalogProduct } from './catalog';
import { AUDIENCES, type Audience } from './labels';
import { SORT_OPTIONS, type SortOption } from './listing';

export type ListingFilters = {
  deporte: string[];
  categoria: string[];
  marca: string[];
  para: Audience[];
  personalizable: boolean;
};

export type ListingState = { filters: ListingFilters; sort: SortOption };

export const EMPTY_FILTERS: ListingFilters = {
  deporte: [],
  categoria: [],
  marca: [],
  para: [],
  personalizable: false,
};

/** The list-valued filter types, in the order of the filter panel's groups. */
export const FILTER_KEYS = ['deporte', 'categoria', 'marca', 'para'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

const SLUG = /^[a-z0-9-]+$/;

function list(value: string | null): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => SLUG.test(v)),
    ),
  ];
}

/** Anything with get(name), like URLSearchParams or Next's useSearchParams(). */
export type ParamReader = { get(name: string): string | null };

/** A minimal query-string reader (this package has no DOM types: it also runs in Deno). */
function readQuery(query: string): ParamReader {
  const values = new Map<string, string>();
  for (const pair of query.replace(/^\?/, '').split('&')) {
    if (!pair) continue;
    const [rawKey = '', ...rest] = pair.split('=');
    const decode = (v: string) => {
      try {
        return decodeURIComponent(v.replace(/\+/g, ' '));
      } catch {
        return '';
      }
    };
    const key = decode(rawKey);
    if (!values.has(key)) values.set(key, decode(rest.join('=')));
  }
  return { get: (name) => values.get(name) ?? null };
}

/**
 * Reads ?deporte=, ?categoria=, ?marca=, ?para=, ?personalizable=1 and ?orden= (several values
 * separated by commas). Unknown or malformed values are dropped, so any shared URL is safe.
 */
export function parseListingParams(params: ParamReader | string): ListingState {
  const search = typeof params === 'string' ? readQuery(params) : params;
  const sort = search.get('orden');
  return {
    filters: {
      deporte: list(search.get('deporte')),
      categoria: list(search.get('categoria')),
      marca: list(search.get('marca')),
      para: list(search.get('para')).filter((v): v is Audience =>
        (AUDIENCES as readonly string[]).includes(v),
      ),
      personalizable: search.get('personalizable') === '1',
    },
    sort: (SORT_OPTIONS as readonly string[]).includes(sort ?? '')
      ? (sort as SortOption)
      : 'destacados',
  };
}

/** The query string for a state ('' for the default view), so sharing the URL reproduces it. */
export function serializeListingParams({ filters, sort }: ListingState): string {
  // Values are slugs (parseListingParams only keeps [a-z0-9-]), so they need no escaping.
  const parts: string[] = [];
  for (const key of FILTER_KEYS)
    if (filters[key].length) parts.push(`${key}=${filters[key].join(',')}`);
  if (filters.personalizable) parts.push('personalizable=1');
  if (sort !== 'destacados') parts.push(`orden=${sort}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Number of selected options: the "(3)" of "Filtrar (3)". */
export function activeFilterCount(filters: ListingFilters): number {
  return (
    FILTER_KEYS.reduce((sum, key) => sum + filters[key].length, 0) +
    (filters.personalizable ? 1 : 0)
  );
}

const VALUE_OF: Record<FilterKey, (p: CatalogProduct) => string[]> = {
  deporte: (p) => p.sports,
  categoria: (p) => [p.category],
  marca: (p) => [p.brand.slug],
  para: (p) => [p.audience],
};

function matches(p: CatalogProduct, filters: ListingFilters, skip?: FilterKey | 'personalizable') {
  if (skip !== 'personalizable' && filters.personalizable && !p.customizable) return false;
  return FILTER_KEYS.every(
    (key) =>
      key === skip ||
      filters[key].length === 0 ||
      VALUE_OF[key](p).some((value) => (filters[key] as string[]).includes(value)),
  );
}

/** AND between filter types, OR inside one (TRD §7). Keeps the incoming order. */
export function applyFilters(
  products: readonly CatalogProduct[],
  filters: ListingFilters,
): CatalogProduct[] {
  return products.filter((p) => matches(p, filters));
}

export type FacetCounts = Record<FilterKey, Map<string, number>> & { personalizable: number };

/**
 * How many products each option would show, given the other filter types already chosen (the
 * usual faceted count: an option's own group does not narrow its count).
 */
export function facetCounts(
  products: readonly CatalogProduct[],
  filters: ListingFilters,
): FacetCounts {
  const counts = {
    deporte: new Map<string, number>(),
    categoria: new Map<string, number>(),
    marca: new Map<string, number>(),
    para: new Map<string, number>(),
    personalizable: 0,
  };
  for (const p of products) {
    for (const key of FILTER_KEYS) {
      if (!matches(p, filters, key)) continue;
      for (const value of new Set(VALUE_OF[key](p))) {
        counts[key].set(value, (counts[key].get(value) ?? 0) + 1);
      }
    }
    if (p.customizable && matches(p, filters, 'personalizable')) counts.personalizable += 1;
  }
  return counts;
}

/** Adds or removes one option of a filter type. */
export function toggleFilter(
  filters: ListingFilters,
  key: FilterKey,
  value: string,
): ListingFilters {
  const current = filters[key] as string[];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return { ...filters, [key]: next };
}
