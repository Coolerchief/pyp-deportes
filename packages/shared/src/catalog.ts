// Shape of /data/catalog.json (docs/05-BACKEND-SCHEMA.md §10). The build writes it from the
// public_* views (T2.1) and the browser reads it for filters, sorting and search.

import { z } from 'zod';
import { AUDIENCES } from './labels.ts';

const slug = z.string().regex(/^[a-z0-9-]+$/);

export const CatalogVariantSchema = z.object({
  id: z.uuid(),
  sku: z.string().min(1),
  o1: z.string().nullable(),
  o2: z.string().nullable(),
});

export const CatalogProductSchema = z.object({
  id: z.uuid(),
  sku: z.string().min(1),
  slug,
  name: z.string().min(1),
  brand: z.object({ slug, name: z.string().min(1) }),
  category: slug,
  subcategory: slug.nullable(),
  sports: z.array(slug),
  audience: z.enum(AUDIENCES),
  customizable: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int(),
  publishedAt: z.iso.datetime({ offset: true }),
  /** null → generic image of the category (/img/placeholder/<category>.webp). */
  image: z.object({ keyBase: z.string().min(1), alt: z.string() }).nullable(),
  option1Name: z.string().min(1),
  option2Name: z.string().nullable(),
  /** Every product has at least one variant (rule 11). */
  variants: z.array(CatalogVariantSchema).min(1),
  /** Short summary for cards: '10 tallas · colores a elegir'. */
  meta: z.string(),
});

export const CatalogJsonSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  products: z.array(CatalogProductSchema),
  sports: z.array(z.object({ slug, name: z.string().min(1) })),
  categories: z.array(z.object({ slug, name: z.string().min(1), parent: slug.nullable() })),
  brands: z.array(z.object({ slug, name: z.string().min(1) })),
});

export type CatalogVariant = z.output<typeof CatalogVariantSchema>;
export type CatalogProduct = z.output<typeof CatalogProductSchema>;
export type CatalogJson = z.output<typeof CatalogJsonSchema>;
