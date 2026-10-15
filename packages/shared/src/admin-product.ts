// Product editor of the panel (T4.3, APP-FLOW §8.2): the form's rules and the payloads of
// admin_save_product and admin_save_commerce. The database checks the same rules again.

import { z } from 'zod';
import { AUDIENCES, type ProductStatus, TECHNIQUES } from './labels.ts';
import { slugify } from './text.ts';

export const PRODUCT_SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const PRODUCT_LIMITS = {
  nameMax: 120,
  skuMax: 40,
  slugMax: 120,
  shortDescriptionMax: 300,
  descriptionMax: 5000,
  specLabelMax: 60,
  specValueMax: 200,
  minSuggestedQtyMax: 9999,
} as const;

const SpecRowSchema = z.object({
  label: z.string().trim().max(PRODUCT_LIMITS.specLabelMax, 'Máximo 60 caracteres.'),
  value: z.string().trim().max(PRODUCT_LIMITS.specValueMax, 'Máximo 200 caracteres.'),
});

export const ProductFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Escribe el nombre.')
      .max(PRODUCT_LIMITS.nameMax, 'Máximo 120 caracteres.'),
    sku: z
      .string()
      .trim()
      .min(1, 'Escribe el SKU.')
      .max(PRODUCT_LIMITS.skuMax, 'Máximo 40 caracteres.')
      .regex(PRODUCT_SKU_PATTERN, 'Usa letras, números y guiones, por ejemplo BAL-001.')
      .transform((value) => value.toUpperCase()),
    slug: z
      .string()
      .trim()
      .min(1, 'Escribe la dirección.')
      .max(PRODUCT_LIMITS.slugMax, 'Máximo 120 caracteres.')
      .regex(PRODUCT_SLUG_PATTERN, 'Usa minúsculas, números y guiones, sin espacios.'),
    brandId: z.string().min(1, 'Elige la marca.'),
    categoryId: z.string().min(1, 'Elige la categoría.'),
    subcategoryId: z.string(),
    sportIds: z.array(z.string()),
    audience: z.enum(AUDIENCES),
    shortDescription: z
      .string()
      .trim()
      .max(PRODUCT_LIMITS.shortDescriptionMax, 'Máximo 300 caracteres.'),
    description: z.string().trim().max(PRODUCT_LIMITS.descriptionMax, 'Máximo 5000 caracteres.'),
    /** Comma separated, as typed. */
    tags: z.string(),
    specs: z.array(SpecRowSchema),
    isCustomizable: z.boolean(),
    techniques: z.array(z.enum(TECHNIQUES)),
    /** Digits as typed; empty = no suggestion. */
    minSuggestedQty: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === '' ||
          (/^\d+$/.test(value) &&
            Number(value) >= 1 &&
            Number(value) <= PRODUCT_LIMITS.minSuggestedQtyMax),
        'Escribe un número de 1 a 9999 o déjalo vacío.',
      ),
    isFeatured: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.isCustomizable && values.techniques.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['techniques'],
        message: 'Elige al menos una técnica o quita "Se puede personalizar".',
      });
    }
    values.specs.forEach((row, index) => {
      if (row.label === '' && row.value !== '') {
        ctx.addIssue({
          code: 'custom',
          path: ['specs', index, 'label'],
          message: 'Falta el nombre.',
        });
      }
      if (row.value === '' && row.label !== '') {
        ctx.addIssue({
          code: 'custom',
          path: ['specs', index, 'value'],
          message: 'Falta el valor.',
        });
      }
    });
  });

export type ProductFormInput = z.input<typeof ProductFormSchema>;
export type ProductForm = z.output<typeof ProductFormSchema>;

export const EMPTY_PRODUCT_FORM: ProductFormInput = {
  name: '',
  sku: '',
  slug: '',
  brandId: '',
  categoryId: '',
  subcategoryId: '',
  sportIds: [],
  audience: 'unisex',
  shortDescription: '',
  description: '',
  tags: '',
  specs: [],
  isCustomizable: false,
  techniques: [],
  minSuggestedQty: '',
  isFeatured: false,
};

/** Proposed address while the product is new: follows the name until edited by hand. */
export function proposeSlug(name: string): string {
  return slugify(name).slice(0, PRODUCT_LIMITS.slugMax).replace(/-+$/, '');
}

/** 'cosido, Fútbol ,, cosido' → ['cosido', 'Fútbol']. */
export function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

export type ProductPayload = {
  id?: string;
  status: ProductStatus;
  sku: string;
  slug: string;
  name: string;
  brandId: string;
  categoryId: string;
  subcategoryId: string | null;
  sportIds: string[];
  audience: ProductForm['audience'];
  shortDescription: string;
  description: string;
  tags: string[];
  specs: { label: string; value: string }[];
  isCustomizable: boolean;
  techniques: ProductForm['techniques'];
  minSuggestedQty: number | null;
  isFeatured: boolean;
};

/** What admin_save_product receives; techniques are dropped when not customizable. */
export function productPayload(
  values: ProductForm,
  options: { id?: string; status: ProductStatus },
): ProductPayload {
  return {
    ...(options.id ? { id: options.id } : {}),
    status: options.status,
    sku: values.sku,
    slug: values.slug,
    name: values.name,
    brandId: values.brandId,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId || null,
    sportIds: values.sportIds,
    audience: values.audience,
    shortDescription: values.shortDescription,
    description: values.description,
    tags: parseTags(values.tags),
    specs: values.specs.filter((row) => row.label !== '' && row.value !== ''),
    isCustomizable: values.isCustomizable,
    techniques: values.isCustomizable ? values.techniques : [],
    minSuggestedQty: values.minSuggestedQty === '' ? null : Number(values.minSuggestedQty),
    isFeatured: values.isFeatured,
  };
}

// Hidden commerce (catalog mode) ---------------------------------------------------------------

/** '450', '450.5', '1,200.00' → cents; null when it is not an amount. */
export function pesosToCents(value: string): number | null {
  const clean = value.trim().replace(/[$\s,]/g, '');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, fraction = ''] = clean.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** 45000 → '450.00'. */
export function centsToPesos(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

const wholeNumber = (min: number, message: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= 999_999,
      message,
    );

export const CommerceFormSchema = z.object({
  variants: z.array(
    z.object({
      variantId: z.string(),
      prices: z
        .array(
          z.object({
            minQty: wholeNumber(1, 'Desde 1 pieza.'),
            price: z
              .string()
              .refine(
                (value) => pesosToCents(value) !== null,
                'Escribe un importe, por ejemplo 450.00.',
              ),
          }),
        )
        .superRefine((rows, ctx) => {
          const seen = new Set<string>();
          rows.forEach((row, index) => {
            const key = String(Number(row.minQty));
            if (seen.has(key)) {
              ctx.addIssue({
                code: 'custom',
                path: [index, 'minQty'],
                message: 'Ya hay un precio desde esa cantidad.',
              });
            }
            seen.add(key);
          });
        }),
      stock: z.array(
        z.object({
          storeId: z.string(),
          quantity: z
            .string()
            .trim()
            .refine((value) => value === '' || /^\d{1,6}$/.test(value), 'Escribe 0 o más piezas.'),
        }),
      ),
    }),
  ),
});
export type CommerceForm = z.input<typeof CommerceFormSchema>;

export type CommercePayload = {
  variantId: string;
  prices: { minQty: number; unitPriceCents: number }[];
  stock: { storeId: string; quantity: number }[];
}[];

/** What admin_save_commerce receives; an empty stock box means "not counted". */
export function commercePayload(values: CommerceForm): CommercePayload {
  return values.variants.map((variant) => ({
    variantId: variant.variantId,
    prices: variant.prices
      .map((row) => ({ minQty: Number(row.minQty), unitPriceCents: pesosToCents(row.price) ?? 0 }))
      .sort((a, b) => a.minQty - b.minQty),
    stock: variant.stock
      .filter((row) => row.quantity.trim() !== '')
      .map((row) => ({ storeId: row.storeId, quantity: Number(row.quantity) })),
  }));
}
