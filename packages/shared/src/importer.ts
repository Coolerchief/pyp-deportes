// One row of the catalog CSV (docs/data/sitio-actual.md §4). The admin validates each row with
// this schema for its preview before sending the raw rows to admin_import_products, which
// applies the same rules in SQL (docs/05-BACKEND-SCHEMA.md §8.2).

import { z } from 'zod';
import { AUDIENCES, TECHNIQUES, type ProductStatus } from './labels.ts';

export const IMPORT_BATCH_SIZE = 50;

export const IMPORT_COLUMNS = [
  'sku',
  'slug',
  'nombre',
  'marca',
  'categoria',
  'subcategoria',
  'deportes',
  'publico',
  'descripcion_corta',
  'personalizable',
  'tecnicas',
  'tallas',
  'colores',
  'destacado',
  'estado',
  'origen',
  'url_anterior',
] as const;

const SLUG = /^[a-z0-9-]+$/;
const statusByCsv: Record<string, ProductStatus> = {
  borrador: 'draft',
  publicado: 'published',
  archivado: 'archived',
};

/** 'a | b|c' → ['a', 'b', 'c']. */
export function splitList(value: string): string[] {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

const text = z
  .string()
  .optional()
  .transform((value) => (value ?? '').trim());

const yesNo = (column: string) =>
  text
    .refine(
      (value) => ['si', 'sí', 'no', ''].includes(value.toLowerCase()),
      `${column} debe ser si o no.`,
    )
    .transform((value) => ['si', 'sí'].includes(value.toLowerCase()));

export const ImportRowSchema = z
  .object({
    sku: text.refine((value) => value !== '', 'Falta el SKU.'),
    slug: text.refine(
      (value) => SLUG.test(value),
      'El slug solo puede tener minúsculas, números y guiones.',
    ),
    nombre: text.refine((value) => value !== '', 'Falta el nombre.'),
    marca: text.refine((value) => value !== '', 'Falta la marca.'),
    categoria: text.refine((value) => SLUG.test(value), 'La categoría no es un slug válido.'),
    subcategoria: text.refine(
      (value) => value === '' || SLUG.test(value),
      'La subcategoría no es un slug válido.',
    ),
    deportes: text
      .transform((value) => splitList(value.toLowerCase()))
      .refine(
        (list) => list.every((slug) => SLUG.test(slug)),
        'deportes debe traer slugs separados por |.',
      ),
    publico: text
      .transform((value) => value.toLowerCase() || 'unisex')
      .pipe(z.enum(AUDIENCES, 'publico debe ser adulto, infantil o unisex.')),
    descripcion_corta: text,
    personalizable: yesNo('personalizable'),
    tecnicas: text
      .transform((value) => splitList(value.toLowerCase()))
      .pipe(
        z.array(
          z.enum(TECHNIQUES, 'tecnicas solo acepta sublimacion, vinil, bordado y serigrafia.'),
        ),
      ),
    tallas: text.transform(splitList),
    colores: text.transform(splitList),
    destacado: yesNo('destacado'),
    estado: text
      .transform((value) => value.toLowerCase())
      .refine(
        (value) => value === '' || value in statusByCsv,
        'estado debe ser borrador, publicado o archivado.',
      )
      .transform((value): ProductStatus => statusByCsv[value] ?? 'draft'),
    origen: text,
    url_anterior: text,
  })
  .superRefine((row, ctx) => {
    if (row.url_anterior === '') return;
    const legacySlug = /\/([^/]+)\/?$/.exec(row.url_anterior)?.[1];
    if (legacySlug !== row.slug) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: `El slug no coincide con el de url_anterior ("${legacySlug ?? ''}").`,
      });
    }
  })
  .transform((row) => {
    // 'unitalla' means no size dimension; 'A elegir' means color is a note, not a variant.
    const sizes =
      row.tallas.length === 1 && row.tallas[0]?.toLowerCase() === 'unitalla' ? [] : row.tallas;
    const colorNote =
      row.colores.length === 1 && row.colores[0]?.toLowerCase() === 'a elegir' ? 'A elegir' : null;
    return {
      sku: row.sku,
      slug: row.slug,
      name: row.nombre,
      brand: row.marca,
      category: row.categoria,
      subcategory: row.subcategoria || null,
      sports: row.deportes,
      audience: row.publico,
      shortDescription: row.descripcion_corta,
      isCustomizable: row.personalizable,
      techniques: row.tecnicas,
      sizes,
      colors: colorNote ? [] : row.colores,
      colorNote,
      isFeatured: row.destacado,
      status: row.estado,
      legacyUrl: row.url_anterior || null,
      /** Number of variants the row will produce (sizes × colors, at least 1). */
      variantCount: Math.max(sizes.length, 1) * Math.max(colorNote ? 0 : row.colores.length, 1),
    };
  });

export type ImportRowInput = z.input<typeof ImportRowSchema>;
export type ImportRow = z.output<typeof ImportRowSchema>;

/** Result of admin_import_products for one batch. */
export const ImportResultSchema = z.object({
  created: z.number().int(),
  updated: z.number().int(),
  errors: z.array(
    z.object({ row: z.number().int(), sku: z.string().nullable(), message: z.string() }),
  ),
  warnings: z.array(z.object({ row: z.number().int(), sku: z.string(), message: z.string() })),
});
export type ImportResult = z.output<typeof ImportResultSchema>;
