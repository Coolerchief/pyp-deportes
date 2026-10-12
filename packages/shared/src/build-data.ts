// Build data layer (T2.1, docs/02-TRD.md §6.1 and docs/05-BACKEND-SCHEMA.md §10). The build reads
// only the public_* views; every row is validated here and turned into /data/catalog.json and
// /data/settings.json. Any invalid row stops the build with the view and the row id.

import { z } from 'zod';
import { type CatalogJson, CatalogJsonSchema, type CatalogProduct } from './catalog';
import { AUDIENCES, TECHNIQUES } from './labels';

const slug = z.string().regex(/^[a-z0-9-]+$/, 'slug inválido');
const timestamp = z.iso.datetime({ offset: true });
const nonEmpty = z.string().trim().min(1, 'vacío');

// Rows of each view ----------------------------------------------------------------------------

export const PublicProductRowSchema = z.object({
  id: z.uuid(),
  sku: nonEmpty,
  slug,
  name: nonEmpty,
  brand_id: z.uuid(),
  category_id: z.uuid(),
  subcategory_id: z.uuid().nullable(),
  audience: z.enum(AUDIENCES),
  short_description: z.string(),
  description: z.string(),
  specs: z.array(z.object({ label: nonEmpty, value: nonEmpty })),
  tags: z.array(z.string()),
  option1_name: nonEmpty,
  option2_name: nonEmpty.nullable(),
  color_note: z.string().nullable(),
  is_customizable: z.boolean(),
  techniques: z.array(z.enum(TECHNIQUES)),
  min_suggested_qty: z.number().int().positive().nullable(),
  is_featured: z.boolean(),
  sort_order: z.number().int(),
  status: z.literal('published'),
  published_at: timestamp,
  legacy_url: z.string().nullable(),
});

export const PublicVariantRowSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  sku: nonEmpty,
  option1_value: z.string().nullable(),
  option2_value: z.string().nullable(),
  is_default: z.boolean(),
  sort_order: z.number().int(),
});

export const PublicImageRowSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  variant_id: z.uuid().nullable(),
  key_base: nonEmpty,
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sort_order: z.number().int(),
});

export const PublicProductSportRowSchema = z.object({
  product_id: z.uuid(),
  sport_id: z.uuid(),
});

export const PublicSportRowSchema = z.object({
  id: z.uuid(),
  slug,
  name: nonEmpty,
  sort_order: z.number().int(),
});

export const PublicCategoryRowSchema = z.object({
  id: z.uuid(),
  parent_id: z.uuid().nullable(),
  slug,
  name: nonEmpty,
  size_label: nonEmpty,
  sort_order: z.number().int(),
});

export const PublicBrandRowSchema = z.object({
  id: z.uuid(),
  slug,
  name: nonEmpty,
  logo_key: z.string().nullable(),
  is_own_brand: z.boolean(),
  sort_order: z.number().int(),
});

const StoreHoursSchema = z.array(
  z.object({
    days: z.array(z.number().int().min(1).max(7)).min(1),
    open: z.string().regex(/^\d{2}:\d{2}$/, 'hora HH:MM'),
    close: z.string().regex(/^\d{2}:\d{2}$/, 'hora HH:MM'),
  }),
);

export const PublicStoreRowSchema = z.object({
  id: z.uuid(),
  slug: nonEmpty,
  name: nonEmpty,
  street: nonEmpty,
  neighborhood: nonEmpty,
  borough: nonEmpty,
  postal_code: nonEmpty,
  city: nonEmpty,
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  hours: StoreHoursSchema,
  directions: z.string(),
  sort_order: z.number().int(),
});

export const PublicSettingRowSchema = z.object({ key: nonEmpty, value: z.unknown() });
export const PublicSiteTextRowSchema = z.object({ key: nonEmpty, value: z.unknown() });

export const SITE_MEDIA_SLOTS = [
  'home_hero',
  'uniforms_hero',
  'technique_sublimacion',
  'technique_vinil',
  'technique_bordado',
  'store_front',
  'store_workshop',
  'advisor',
] as const;
export type SiteMediaSlot = (typeof SITE_MEDIA_SLOTS)[number];

export const PublicSiteMediaRowSchema = z.object({
  slot: z.enum(SITE_MEDIA_SLOTS),
  key_base: z.string().nullable(),
  alt: z.string(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

/**
 * The views the build reads, with the column that identifies a row in error messages and the
 * order that keeps every read (and the CI snapshot) deterministic.
 */
export const BUILD_VIEWS = {
  public_products: { schema: PublicProductRowSchema, id: 'id', order: 'id' },
  public_product_variants: { schema: PublicVariantRowSchema, id: 'id', order: 'id' },
  public_product_images: { schema: PublicImageRowSchema, id: 'id', order: 'id' },
  public_product_sports: {
    schema: PublicProductSportRowSchema,
    id: 'product_id',
    order: 'product_id,sport_id',
  },
  public_sports: { schema: PublicSportRowSchema, id: 'id', order: 'id' },
  public_categories: { schema: PublicCategoryRowSchema, id: 'id', order: 'id' },
  public_brands: { schema: PublicBrandRowSchema, id: 'id', order: 'id' },
  public_stores: { schema: PublicStoreRowSchema, id: 'id', order: 'id' },
  public_settings: { schema: PublicSettingRowSchema, id: 'key', order: 'key' },
  public_site_texts: { schema: PublicSiteTextRowSchema, id: 'key', order: 'key' },
  public_site_media: { schema: PublicSiteMediaRowSchema, id: 'slot', order: 'slot' },
} as const;

export type BuildViewName = keyof typeof BUILD_VIEWS;
export const BUILD_VIEW_NAMES = Object.keys(BUILD_VIEWS) as BuildViewName[];

export type BuildRows = {
  [V in BuildViewName]: z.output<(typeof BUILD_VIEWS)[V]['schema']>[];
};
export type RawBuildRows = Record<BuildViewName, unknown[]>;

// Errors ---------------------------------------------------------------------------------------

const MAX_LISTED_PROBLEMS = 25;

/** Thrown when the data cannot be published; the message lists each problem with view and id. */
export class BuildDataError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    const listed = problems.slice(0, MAX_LISTED_PROBLEMS).map((p) => `  - ${p}`);
    if (problems.length > MAX_LISTED_PROBLEMS) {
      listed.push(`  - … y ${problems.length - MAX_LISTED_PROBLEMS} más`);
    }
    super(
      `Datos inválidos para el build (${problems.length} ${problems.length === 1 ? 'problema' : 'problemas'}). ` +
        `Corrígelos en el panel o en la base y vuelve a publicar:\n${listed.join('\n')}`,
    );
    this.name = 'BuildDataError';
    this.problems = problems;
  }
}

function issuesText(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length ? `${issue.path.join('.')}: ` : ''}${issue.message}`)
    .join('; ');
}

function rowId(row: unknown, column: string): string {
  const value = row && typeof row === 'object' ? (row as Record<string, unknown>)[column] : null;
  return typeof value === 'string' && value ? value : '(sin id)';
}

/** Validates the raw rows of every view. Collects every problem before failing. */
export function validateBuildRows(raw: RawBuildRows): BuildRows {
  const problems: string[] = [];
  const rows = {} as Record<BuildViewName, unknown[]>;
  for (const view of BUILD_VIEW_NAMES) {
    const { schema, id } = BUILD_VIEWS[view];
    const list = raw[view];
    if (!Array.isArray(list)) {
      problems.push(`${view}: no se pudo leer la vista.`);
      rows[view] = [];
      continue;
    }
    rows[view] = list.flatMap((row) => {
      const result = schema.safeParse(row);
      if (result.success) return [result.data];
      problems.push(`${view} ${id} ${rowId(row, id)}: ${issuesText(result.error)}`);
      return [];
    });
  }
  if (problems.length) throw new BuildDataError(problems);
  return rows as BuildRows;
}

// catalog.json ---------------------------------------------------------------------------------

const PLURALS: Record<string, string> = {
  talla: 'tallas',
  tamaño: 'tamaños',
  peso: 'pesos',
  color: 'colores',
};

function plural(word: string, count: number): string {
  const lower = word.trim().toLowerCase();
  if (count === 1) return lower;
  return PLURALS[lower] ?? (/[aeiouáéíóú]$/.test(lower) ? `${lower}s` : `${lower}es`);
}

function distinctCount(values: (string | null)[]): number {
  return new Set(values.filter((value): value is string => value !== null)).size;
}

/**
 * Short summary for cards (UI/UX §7.4): '10 tallas · colores a elegir', '3 tamaños · 4 colores',
 * '2 tallas'. Only dimensions with a choice are mentioned (one size or one color says nothing);
 * a color note replaces the color count. A product with only its default variant gets ''.
 */
export function catalogMeta(
  product: { option1Name: string; option2Name: string | null; colorNote: string | null },
  variants: { o1: string | null; o2: string | null }[],
): string {
  const parts: string[] = [];
  const sizes = distinctCount(variants.map((v) => v.o1));
  if (sizes > 1) parts.push(`${sizes} ${plural(product.option1Name, sizes)}`);
  const colors = distinctCount(variants.map((v) => v.o2));
  const colorWord = product.option2Name ?? 'Color';
  if (colors > 1) parts.push(`${colors} ${plural(colorWord, colors)}`);
  else if (colors === 0 && product.colorNote?.trim()) {
    parts.push(`${plural(colorWord, 2)} ${product.colorNote.trim().toLowerCase()}`);
  }
  return parts.join(' · ');
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const group = groups.get(k);
    if (group) group.push(row);
    else groups.set(k, [row]);
  }
  return groups;
}

function bySortThen<T extends { sort_order: number }>(key: (row: T) => string) {
  return (a: T, b: T) => a.sort_order - b.sort_order || key(a).localeCompare(key(b), 'es');
}

/**
 * Builds catalog.json from validated rows. Also checks what the views cannot: every product has
 * a brand, a category and at least one variant (rule 11), and the result matches CatalogJsonSchema.
 */
export function buildCatalog(rows: BuildRows, generatedAt: string): CatalogJson {
  const problems: string[] = [];
  const brands = new Map(rows.public_brands.map((b) => [b.id, b]));
  const categories = new Map(rows.public_categories.map((c) => [c.id, c]));
  const sports = new Map(rows.public_sports.map((s) => [s.id, s]));

  const variantsByProduct = groupBy(rows.public_product_variants, (v) => v.product_id);
  const imagesByProduct = groupBy(rows.public_product_images, (i) => i.product_id);
  const sportsByProduct = groupBy(rows.public_product_sports, (ps) => ps.product_id);

  const products: CatalogProduct[] = [];
  for (const p of [...rows.public_products].sort(bySortThen((row) => row.name))) {
    const where = `public_products id ${p.id} (${p.sku})`;
    const brand = brands.get(p.brand_id);
    const category = categories.get(p.category_id);
    const subcategory = p.subcategory_id ? categories.get(p.subcategory_id) : null;
    const variants = [...(variantsByProduct.get(p.id) ?? [])].sort(bySortThen((v) => v.sku));
    if (!brand) problems.push(`${where}: su marca no está en public_brands.`);
    if (!category) problems.push(`${where}: su categoría no está en public_categories.`);
    if (p.subcategory_id && !subcategory) {
      problems.push(`${where}: su subcategoría no está en public_categories.`);
    }
    if (variants.length === 0) problems.push(`${where}: no tiene variantes activas.`);
    if (!brand || !category || variants.length === 0 || (p.subcategory_id && !subcategory)) {
      continue;
    }

    const image = [...(imagesByProduct.get(p.id) ?? [])].sort(
      (a, b) =>
        Number(a.variant_id !== null) - Number(b.variant_id !== null) ||
        a.sort_order - b.sort_order ||
        a.id.localeCompare(b.id),
    )[0];
    const catalogVariants = variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      o1: v.option1_value,
      o2: v.option2_value,
    }));
    products.push({
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      brand: { slug: brand.slug, name: brand.name },
      category: category.slug,
      subcategory: subcategory?.slug ?? null,
      sports: (sportsByProduct.get(p.id) ?? [])
        .map((ps) => sports.get(ps.sport_id))
        .filter((s) => s !== undefined)
        .sort(bySortThen((s) => s.name))
        .map((s) => s.slug),
      audience: p.audience,
      customizable: p.is_customizable,
      featured: p.is_featured,
      sortOrder: p.sort_order,
      publishedAt: p.published_at,
      image: image ? { keyBase: image.key_base, alt: image.alt } : null,
      option1Name: p.option1_name,
      option2Name: p.option2_name,
      variants: catalogVariants,
      meta: catalogMeta(
        { option1Name: p.option1_name, option2Name: p.option2_name, colorNote: p.color_note },
        catalogVariants,
      ),
    });
  }
  if (problems.length) throw new BuildDataError(problems);

  const catalog = CatalogJsonSchema.safeParse({
    generatedAt,
    products,
    sports: [...rows.public_sports]
      .sort(bySortThen((s) => s.name))
      .map((s) => ({ slug: s.slug, name: s.name })),
    categories: [...rows.public_categories].sort(bySortThen((c) => c.name)).map((c) => ({
      slug: c.slug,
      name: c.name,
      parent: c.parent_id ? (categories.get(c.parent_id)?.slug ?? null) : null,
    })),
    brands: [...rows.public_brands]
      .sort(bySortThen((b) => b.name))
      .map((b) => ({ slug: b.slug, name: b.name })),
  });
  if (!catalog.success) throw new BuildDataError([`catalog.json: ${issuesText(catalog.error)}`]);
  return catalog.data;
}

// settings.json --------------------------------------------------------------------------------

const FlagsSchema = z.object({
  show_prices: z.boolean(),
  enable_checkout: z.boolean(),
  enable_shipping: z.boolean(),
  enable_stock: z.boolean(),
});

/** Public settings the site needs (docs/05-BACKEND-SCHEMA.md §4.7). */
const PUBLIC_SETTINGS = {
  whatsapp_sales_number: z.string().regex(/^[0-9]{10}$/, '10 dígitos sin +52'),
  site_name: nonEmpty,
  social: z.object({ instagram: z.string().optional(), facebook: z.string().optional() }),
  flags: FlagsSchema,
  ga_measurement_id: z.string().nullable(),
} as const;

/** Site texts the pages use; other keys pass through unchecked. */
const SITE_TEXTS = {
  advisor: z.object({ name: nonEmpty, role: nonEmpty, quote: nonEmpty }),
  uniforms_faq: z.array(z.object({ question: nonEmpty, answer: nonEmpty })).min(1),
  store_history: z.object({ text: nonEmpty }),
  privacy_notice: z.object({
    version: nonEmpty,
    updatedAt: nonEmpty,
    sections: z.array(z.object({ title: nonEmpty, body: nonEmpty })).min(1),
  }),
} as const;

const SiteMediaSchema = z
  .object({ keyBase: nonEmpty, alt: z.string(), width: z.number(), height: z.number() })
  .nullable();

export const SettingsJsonSchema = z.object({
  generatedAt: timestamp,
  siteName: nonEmpty,
  whatsappSalesNumber: PUBLIC_SETTINGS.whatsapp_sales_number,
  flags: z.object({
    showPrices: z.boolean(),
    enableCheckout: z.boolean(),
    enableShipping: z.boolean(),
    enableStock: z.boolean(),
  }),
  social: PUBLIC_SETTINGS.social,
  gaMeasurementId: z.string().nullable(),
  store: z.object({
    slug: nonEmpty,
    name: nonEmpty,
    street: nonEmpty,
    neighborhood: nonEmpty,
    borough: nonEmpty,
    postalCode: nonEmpty,
    city: nonEmpty,
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    hours: StoreHoursSchema,
    directions: z.string(),
  }),
  siteMedia: z.record(z.enum(SITE_MEDIA_SLOTS), SiteMediaSchema),
  siteTexts: z
    .object({
      advisor: SITE_TEXTS.advisor,
      uniforms_faq: SITE_TEXTS.uniforms_faq,
      store_history: SITE_TEXTS.store_history,
      privacy_notice: SITE_TEXTS.privacy_notice,
    })
    .catchall(z.unknown()),
  privacyVersion: nonEmpty,
});

export type SettingsJson = z.output<typeof SettingsJsonSchema>;

/** Builds settings.json: public settings, the first active store, site photos and texts. */
export function buildSettings(rows: BuildRows, generatedAt: string): SettingsJson {
  const problems: string[] = [];

  const settings = new Map(rows.public_settings.map((s) => [s.key, s.value]));
  const parsed: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(PUBLIC_SETTINGS)) {
    if (!settings.has(key)) {
      problems.push(`public_settings key ${key}: falta (o no es público).`);
      continue;
    }
    const result = schema.safeParse(settings.get(key));
    if (result.success) parsed[key] = result.data;
    else problems.push(`public_settings key ${key}: ${issuesText(result.error)}`);
  }

  const texts = new Map(rows.public_site_texts.map((t) => [t.key, t.value]));
  const siteTexts: Record<string, unknown> = Object.fromEntries(texts);
  for (const [key, schema] of Object.entries(SITE_TEXTS)) {
    if (!texts.has(key)) {
      problems.push(`public_site_texts key ${key}: falta.`);
      continue;
    }
    const result = schema.safeParse(texts.get(key));
    if (result.success) siteTexts[key] = result.data;
    else problems.push(`public_site_texts key ${key}: ${issuesText(result.error)}`);
  }

  const media = new Map(rows.public_site_media.map((m) => [m.slot, m]));
  const siteMedia = {} as Record<SiteMediaSlot, z.output<typeof SiteMediaSchema>>;
  for (const slot of SITE_MEDIA_SLOTS) {
    const row = media.get(slot);
    if (!row) {
      problems.push(`public_site_media slot ${slot}: falta.`);
      continue;
    }
    if (row.key_base && (row.width === null || row.height === null)) {
      problems.push(`public_site_media slot ${slot}: la foto no tiene medidas.`);
      continue;
    }
    siteMedia[slot] =
      row.key_base && row.width !== null && row.height !== null
        ? { keyBase: row.key_base, alt: row.alt, width: row.width, height: row.height }
        : null;
  }

  const store = [...rows.public_stores].sort(bySortThen((s) => s.name))[0];
  if (!store) problems.push('public_stores: no hay ninguna tienda activa.');

  if (problems.length || !store) throw new BuildDataError(problems);

  const flags = parsed.flags as z.output<typeof FlagsSchema>;
  const privacy = siteTexts.privacy_notice as z.output<typeof SITE_TEXTS.privacy_notice>;
  const result = SettingsJsonSchema.safeParse({
    generatedAt,
    siteName: parsed.site_name,
    whatsappSalesNumber: parsed.whatsapp_sales_number,
    flags: {
      showPrices: flags.show_prices,
      enableCheckout: flags.enable_checkout,
      enableShipping: flags.enable_shipping,
      enableStock: flags.enable_stock,
    },
    social: parsed.social,
    gaMeasurementId: parsed.ga_measurement_id,
    store: {
      slug: store.slug,
      name: store.name,
      street: store.street,
      neighborhood: store.neighborhood,
      borough: store.borough,
      postalCode: store.postal_code,
      city: store.city,
      lat: store.lat,
      lng: store.lng,
      phone: store.phone,
      email: store.email,
      hours: store.hours,
      directions: store.directions,
    },
    siteMedia,
    siteTexts,
    privacyVersion: privacy.version,
  });
  if (!result.success) throw new BuildDataError([`settings.json: ${issuesText(result.error)}`]);
  return result.data;
}
