// Rules behind a product card (UI/UX §7.4): which action it shows and which badges it carries.

import type { CatalogProduct } from './catalog.ts';

/** Days a product counts as "Nuevo" after it is published. */
export const NEW_PRODUCT_DAYS = 30;

/**
 * A product with a single variant has nothing to choose: its card offers "+ Cotizar" (adds one
 * piece) instead of "Ver tallas". Rule 11: that single variant is still what the quote stores.
 */
export function hasVariantChoice(product: Pick<CatalogProduct, 'variants'>): boolean {
  return product.variants.length > 1;
}

/**
 * Products published in the last NEW_PRODUCT_DAYS days before `now` (the build time). When more
 * than half of the catalog qualifies, as on launch day or after a bulk import, nobody gets the
 * badge: "Nuevo" on every card says nothing.
 */
export function newProductIds(
  products: readonly Pick<CatalogProduct, 'id' | 'publishedAt'>[],
  now: string,
  days = NEW_PRODUCT_DAYS,
): Set<string> {
  const since = new Date(now).getTime() - days * 86_400_000;
  const recent = products.filter((p) => new Date(p.publishedAt).getTime() >= since);
  return recent.length * 2 > products.length ? new Set() : new Set(recent.map((p) => p.id));
}

export type ProductBadge = { variant: 'new' | 'custom'; label: string };

/** At most two badges, in the design's order: "Nuevo", then "Personalizable". */
export function productBadges(
  product: Pick<CatalogProduct, 'customizable'>,
  isNew: boolean,
): ProductBadge[] {
  const badges: ProductBadge[] = [];
  if (isNew) badges.push({ variant: 'new', label: 'Nuevo' });
  if (product.customizable) badges.push({ variant: 'custom', label: 'Personalizable' });
  return badges;
}
