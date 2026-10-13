// Props of each static listing route (T2.4) from the build data: products of the route, the
// breadcrumb, the chips and, on sport pages, the two shortcuts. Selection and order rules live
// in @pyp/shared (listing.ts).

import {
  categoriesIn,
  type CatalogJson,
  EMPTY_FILTERS,
  facetCounts,
  type ListingScope,
  listingProducts,
  newProductIds,
  sportShortcuts,
} from '@pyp/shared';
import type { ComponentProps } from 'react';
import type { ListingPage } from '@/components/catalog/ListingPage';
import { getBuildData } from './data';
import { serializeCounts } from './facets';
import { buildSiteNav, ROUTES } from './navigation';

export type ListingProps = ComponentProps<typeof ListingPage>;

/**
 * Stand-in param when a dynamic route has nothing to generate: `output: 'export'` fails on an
 * empty generateStaticParams, and production has no categories, sports or brands until its
 * catalog is loaded (their public views only list rows with published products). The page
 * answers notFound() for it and nothing links to it.
 */
export const EMPTY_PARAM = '_';

export function staticParams<K extends string>(key: K, slugs: string[]): Record<K, string>[] {
  const values = slugs.length > 0 ? slugs : [EMPTY_PARAM];
  return values.map((slug) => ({ [key]: slug }) as Record<K, string>);
}

const HOME = { label: 'Inicio', href: ROUTES.home };
const CATALOG = { label: 'Catálogo', href: ROUTES.catalog };

/** The listing of a route, or null when its slug is not in the catalog (→ notFound). */
export function buildListing(
  catalog: CatalogJson,
  whatsappUrl: string,
  scope: ListingScope,
): ListingProps | null {
  const category = (slug: string) => catalog.categories.find((c) => c.slug === slug);
  const products = listingProducts(catalog, scope);
  const names = <T extends { slug: string; name: string }>(rows: T[]) =>
    Object.fromEntries(rows.map((row) => [row.slug, row.name]));
  const base = {
    scope,
    products,
    categoryNames: names(catalog.categories),
    labels: {
      deporte: names(catalog.sports),
      categoria: names(catalog.categories),
      marca: names(catalog.brands),
    },
    scopeCounts: serializeCounts(facetCounts(products, EMPTY_FILTERS)),
    newIds: [...newProductIds(catalog.products, catalog.generatedAt)],
    whatsappUrl,
  };

  switch (scope.kind) {
    case 'all':
      return {
        ...base,
        title: 'Catálogo',
        basePath: ROUTES.catalog,
        breadcrumbs: [HOME, { label: 'Catálogo' }],
        chips: [
          { label: 'Todo', href: ROUTES.catalog, active: true },
          ...categoriesIn(catalog, products).map((c) => ({
            label: c.name,
            href: ROUTES.category(c.slug),
            active: false,
          })),
        ],
      };
    case 'category':
    case 'subcategory': {
      const parent = category(scope.category);
      if (!parent || parent.parent !== null) return null;
      const sub = scope.kind === 'subcategory' ? category(scope.subcategory) : undefined;
      if (scope.kind === 'subcategory' && sub?.parent !== parent.slug) return null;
      const siblings = categoriesIn(
        catalog,
        listingProducts(catalog, { kind: 'category', category: parent.slug }),
        'sub',
      );
      const categoryHref = ROUTES.category(parent.slug);
      return {
        ...base,
        title: sub?.name ?? parent.name,
        basePath: sub ? ROUTES.subcategory(parent.slug, sub.slug) : categoryHref,
        breadcrumbs: sub
          ? [HOME, CATALOG, { label: parent.name, href: categoryHref }, { label: sub.name }]
          : [HOME, CATALOG, { label: parent.name }],
        chips: [
          { label: 'Todo', href: categoryHref, active: !sub },
          ...siblings.map((c) => ({
            label: c.name,
            href: ROUTES.subcategory(parent.slug, c.slug),
            active: c.slug === sub?.slug,
          })),
        ],
      };
    }
    case 'sport':
    case 'brand': {
      const entity =
        scope.kind === 'sport'
          ? catalog.sports.find((s) => s.slug === scope.sport)
          : catalog.brands.find((b) => b.slug === scope.brand);
      if (!entity) return null;
      const href = scope.kind === 'sport' ? ROUTES.sport(entity.slug) : ROUTES.brand(entity.slug);
      return {
        ...base,
        title: entity.name,
        basePath: href,
        breadcrumbs: [
          HOME,
          { label: scope.kind === 'sport' ? 'Deportes' : 'Marcas' },
          { label: entity.name },
        ],
        // No other route per category here: its chips filter this listing with ?categoria=.
        chips: [],
        tabs: [
          { label: 'Todo', category: null },
          ...categoriesIn(catalog, products).map((c) => ({ label: c.name, category: c.slug })),
        ],
        shortcuts:
          scope.kind === 'sport'
            ? sportShortcuts(catalog, products).map((c) => ({
                label: c.name,
                href: ROUTES.subcategory(c.parent ?? '', c.slug),
              }))
            : [],
      };
    }
  }
}

/** Same, reading the build data (pages and generateMetadata share the cached result). */
export async function getListing(scope: ListingScope): Promise<ListingProps | null> {
  const { catalog, settings } = await getBuildData();
  return buildListing(catalog, buildSiteNav(catalog, settings).contact.whatsappUrl, scope);
}

/** "<title> · P&P Deportes Coapa" with the site name from settings. */
export async function listingTitle(title: string): Promise<string> {
  const { settings } = await getBuildData();
  return `${title} · ${settings.siteName}`;
}
