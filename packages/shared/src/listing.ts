// Listing pages (T2.4, APP-FLOW §1): which products each static route shows, in which order,
// and the chips and shortcuts around them. The same functions run in the browser for filters
// and sorting (T2.5).

import type { CatalogJson, CatalogProduct } from './catalog';

/** First batch rendered in the HTML of every listing; "Cargar más" adds the same amount. */
export const LISTING_PAGE_SIZE = 24;

/** Orders of a listing; search adds "Relevancia" first (UI/UX §7.4 SortControl). */
export const SORT_OPTIONS = ['destacados', 'nuevos', 'nombre', 'marca'] as const;
export const SEARCH_SORT_OPTIONS = ['relevancia', ...SORT_OPTIONS] as const;
export type SortOption = (typeof SEARCH_SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  relevancia: 'Relevancia',
  destacados: 'Destacados',
  nuevos: 'Más nuevos',
  nombre: 'Nombre: A a la Z',
  marca: 'Marca: A a la Z',
};

const byName = (a: CatalogProduct, b: CatalogProduct) => a.name.localeCompare(b.name, 'es');

const COMPARE: Record<SortOption, (a: CatalogProduct, b: CatalogProduct) => number> = {
  // Search results already come by relevance: keep them (Array.sort is stable).
  relevancia: () => 0,
  // Featured first, then the order set in the admin, then by name.
  destacados: (a, b) =>
    Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder || byName(a, b),
  nuevos: (a, b) => b.publishedAt.localeCompare(a.publishedAt) || byName(a, b),
  nombre: byName,
  marca: (a, b) => a.brand.name.localeCompare(b.brand.name, 'es') || byName(a, b),
};

/** A sorted copy (UI/UX §7.4 SortControl); never sorts by price while prices are hidden. */
export function sortProducts(
  products: readonly CatalogProduct[],
  sort: SortOption = 'destacados',
): CatalogProduct[] {
  return [...products].sort(COMPARE[sort]);
}

export type ListingScope =
  | { kind: 'all' }
  | { kind: 'category'; category: string }
  | { kind: 'subcategory'; category: string; subcategory: string }
  | { kind: 'sport'; sport: string }
  | { kind: 'brand'; brand: string };

/** Products of a static listing route, in the default order (Destacados). */
export function listingProducts(catalog: CatalogJson, scope: ListingScope): CatalogProduct[] {
  const match = (p: CatalogProduct): boolean => {
    switch (scope.kind) {
      case 'all':
        return true;
      case 'category':
        return p.category === scope.category;
      case 'subcategory':
        return p.category === scope.category && p.subcategory === scope.subcategory;
      case 'sport':
        return p.sports.includes(scope.sport);
      case 'brand':
        return p.brand.slug === scope.brand;
    }
  };
  return sortProducts(catalog.products.filter(match));
}

export type ListingLink = { slug: string; name: string; parent: string | null; count: number };

/**
 * Categories (or, with `level: 'sub'`, subcategories) present in a set of products, in the
 * catalog's order, with how many products each has. Feeds the chips above the grid.
 */
export function categoriesIn(
  catalog: CatalogJson,
  products: readonly CatalogProduct[],
  level: 'top' | 'sub' = 'top',
): ListingLink[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    const slug = level === 'top' ? p.category : p.subcategory;
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return catalog.categories
    .filter((c) => counts.has(c.slug) && (level === 'top' ? c.parent === null : c.parent !== null))
    .map((c) => ({ slug: c.slug, name: c.name, parent: c.parent, count: counts.get(c.slug) ?? 0 }));
}

/**
 * The two large shortcuts of a sport page (UI/UX §8.2): its two subcategories with the most
 * products; on a tie, the one whose category comes first in the catalog (Uniformes leads).
 */
export function sportShortcuts(
  catalog: CatalogJson,
  products: readonly CatalogProduct[],
): ListingLink[] {
  const topOrder = new Map(
    catalog.categories.filter((c) => c.parent === null).map((c, index) => [c.slug, index]),
  );
  const rank = (link: ListingLink) => topOrder.get(link.parent ?? '') ?? Number.MAX_SAFE_INTEGER;
  return categoriesIn(catalog, products, 'sub')
    .map((link, index) => ({ link, index }))
    .sort((a, b) => b.link.count - a.link.count || rank(a.link) - rank(b.link) || a.index - b.index)
    .slice(0, 2)
    .map(({ link }) => link);
}

/** "1 producto" / "28 productos". */
export function productCount(count: number): string {
  return `${count} ${count === 1 ? 'producto' : 'productos'}`;
}
