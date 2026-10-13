// Props of each product page (T2.7) from the build data. catalog.json is the light summary; the
// page also reads the full row (descriptions, specs, techniques) and every image of the views.

import {
  type BuildRows,
  type CatalogJson,
  type CatalogProduct,
  newProductIds,
  optionValues,
  pluralLabel,
  productBadges,
  productSpecs,
  relatedProducts,
  type SpecRow,
  type SettingsJson,
  whatsappUrl,
} from '@pyp/shared';
import type { Crumb } from '@/components/layout/Breadcrumbs';
import { mediaUrl } from './images/loader';
import { ROUTES } from './navigation';

export type GalleryImage = { keyBase: string; alt: string; width: number; height: number };

export type ProductPageData = {
  product: CatalogProduct;
  categoryName: string;
  breadcrumbs: Crumb[];
  badges: ReturnType<typeof productBadges>;
  shortDescription: string;
  description: string;
  images: GalleryImage[];
  /** Option names and values, where the quantity matrix goes in T3.2. */
  options: { label: string; values: string[] }[];
  specs: SpecRow[];
  sports: { href: string; label: string }[];
  related: CatalogProduct[];
  relatedTitle: string;
  relatedHref: string;
  newIds: string[];
  categoryNames: Record<string, string>;
  askUrl: string;
  whatsappUrl: string;
  jsonLd: Record<string, unknown>;
};

/** Public base URL (NEXT_PUBLIC_SITE_URL); without it, JSON-LD and messages skip absolute links. */
export function siteUrl(env: Record<string, string | undefined> = process.env): string | null {
  const url = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  return url || null;
}

export function buildProductPage(
  rows: BuildRows,
  catalog: CatalogJson,
  settings: SettingsJson,
  slug: string,
  base: string | null = siteUrl(),
): ProductPageData | null {
  const product = catalog.products.find((p) => p.slug === slug);
  const row = rows.public_products.find((p) => p.slug === slug);
  if (!product || !row) return null;

  const category = catalog.categories.find((c) => c.slug === product.category);
  const sub = catalog.categories.find((c) => c.slug === product.subcategory);
  const categoryName = category?.name ?? product.category;
  const path = ROUTES.product(product.slug);
  const newIds = newProductIds(catalog.products, catalog.generatedAt);

  // Product images first (the ones without a variant), then the variants', in admin order.
  const images = rows.public_product_images
    .filter((i) => i.product_id === product.id)
    .sort(
      (a, b) =>
        Number(a.variant_id !== null) - Number(b.variant_id !== null) ||
        a.sort_order - b.sort_order ||
        a.id.localeCompare(b.id),
    )
    .map((i) => ({
      keyBase: i.key_base,
      alt: i.alt || product.name,
      width: i.width,
      height: i.height,
    }));

  const { o1, o2 } = optionValues(product.variants);
  const options = [
    ...(o1.length ? [{ label: pluralLabel(product.option1Name), values: o1 }] : []),
    ...(o2.length ? [{ label: pluralLabel(product.option2Name ?? 'Color'), values: o2 }] : []),
  ];

  const sportName = new Map(catalog.sports.map((s) => [s.slug, s.name]));
  const sports = product.sports
    .filter((s) => sportName.has(s))
    .map((s) => ({ href: ROUTES.sport(s), label: sportName.get(s) as string }));

  const breadcrumbs: Crumb[] = [
    { label: 'Inicio', href: ROUTES.home },
    { label: categoryName, href: ROUTES.category(product.category) },
    ...(sub ? [{ label: sub.name, href: ROUTES.subcategory(product.category, sub.slug) }] : []),
    { label: product.name },
  ];

  const pageUrl = base ? `${base}${path}` : null;
  const ask = whatsappUrl(
    settings.whatsappSalesNumber,
    `Hola, me interesa *${product.name}* (${product.sku}).${pageUrl ? ` ${pageUrl}` : ''}`,
  );

  // schema.org Product without offers while the site shows no prices (TRD §11).
  const imageUrls = images.length
    ? images.map((i) => mediaUrl(i.keyBase) + '-1024.webp')
    : base
      ? [`${base}/img/placeholder/${product.category}.webp`]
      : [];
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand.name },
    category: sub ? `${categoryName} > ${sub.name}` : categoryName,
    ...(row.short_description || row.description
      ? { description: row.short_description || row.description }
      : {}),
    ...(imageUrls.length ? { image: imageUrls } : {}),
    ...(pageUrl ? { url: pageUrl } : {}),
  };

  return {
    product,
    categoryName,
    breadcrumbs,
    badges: productBadges(product, newIds.has(product.id)),
    shortDescription: row.short_description,
    description: row.description,
    images,
    options,
    specs: productSpecs({
      ...product,
      customizable: row.is_customizable,
      techniques: row.techniques,
      colorNote: row.color_note,
      minSuggestedQty: row.min_suggested_qty,
      specs: row.specs,
    }),
    sports,
    related: relatedProducts(catalog, product),
    relatedTitle: product.customizable ? 'Completa el uniforme' : 'También te puede interesar',
    relatedHref: ROUTES.category(product.category),
    newIds: [...newIds],
    categoryNames: Object.fromEntries(catalog.categories.map((c) => [c.slug, c.name])),
    askUrl: ask,
    whatsappUrl: whatsappUrl(settings.whatsappSalesNumber),
    jsonLd,
  };
}
