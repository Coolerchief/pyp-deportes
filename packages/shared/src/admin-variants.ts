// Variant generator of the panel (T4.4, APP-FLOW §8.2 step 3): sizes × colors, the preview of
// what regenerating does, and the form's rules. admin_save_variants applies the same rules and
// admin_replace_variants keeps the ids of the combinations that already exist.

import { z } from 'zod';
import { slugify, variantLabel, variantSku } from './text.ts';

export const VARIANT_LIMITS = {
  maxVariants: 200,
  valueMax: 40,
  nameMax: 30,
  noteMax: 60,
} as const;

/** Quick fills taken from the scales of the initial catalog. */
export const VARIANT_PRESETS = [
  { label: 'Adulto', values: ['CH', 'M', 'G', 'XG', 'XXG'] },
  { label: 'Infantil', values: ['6', '8', '10', '12', '14'] },
  { label: 'Balón', values: ['3', '4', '5'] },
  { label: 'Guantes', values: ['10oz', '12oz', '14oz', '16oz'] },
] as const;

/** 'CH, M | G,, M' → ['CH', 'M', 'G']: commas or bars, trimmed, without repeats. */
export function parseOptionValues(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[,|]/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

export type ExistingVariant = {
  id: string;
  option1: string | null;
  option2: string | null;
  isActive: boolean;
};

export type PlannedVariant = {
  option1: string | null;
  option2: string | null;
  label: string;
  sku: string;
  /** new: created · kept: already active · reactivated: existed but was deactivated. */
  state: 'new' | 'kept' | 'reactivated';
};

export type VariantPlan = {
  rows: PlannedVariant[];
  /** Active variants that regenerating deactivates (never deleted). */
  deactivated: (ExistingVariant & { label: string })[];
  /** Nothing would change. */
  unchanged: boolean;
};

const same = (a: string | null, b: string | null) => (a ?? null) === (b ?? null);

/** What admin_replace_variants will do with these values, in the same order. */
export function planVariants(input: {
  productSku: string;
  option1: string[];
  option2: string[];
  existing: ExistingVariant[];
}): VariantPlan {
  const first: (string | null)[] = input.option1.length ? input.option1 : [null];
  const second: (string | null)[] = input.option2.length ? input.option2 : [null];
  const rows: PlannedVariant[] = first.flatMap((option1) =>
    second.map((option2) => {
      const match = input.existing.find(
        (variant) => same(variant.option1, option1) && same(variant.option2, option2),
      );
      return {
        option1,
        option2,
        label: variantLabel(option1, option2) ?? 'Única',
        sku: variantSku(input.productSku, option1, option2),
        state: !match ? 'new' : match.isActive ? 'kept' : 'reactivated',
      } satisfies PlannedVariant;
    }),
  );
  const deactivated = input.existing
    .filter(
      (variant) =>
        variant.isActive &&
        !rows.some(
          (row) => same(row.option1, variant.option1) && same(row.option2, variant.option2),
        ),
    )
    .map((variant) => ({
      ...variant,
      label: variantLabel(variant.option1, variant.option2) ?? 'Única',
    }));
  return {
    rows,
    deactivated,
    unchanged: deactivated.length === 0 && rows.every((row) => row.state === 'kept'),
  };
}

export const VariantsFormSchema = z
  .object({
    option1Name: z
      .string()
      .trim()
      .min(1, 'Escribe el nombre de la opción, por ejemplo Talla.')
      .max(VARIANT_LIMITS.nameMax, 'Máximo 30 caracteres.'),
    /** Comma separated, as typed. */
    option1Values: z.string(),
    hasColors: z.boolean(),
    option2Name: z.string().trim().max(VARIANT_LIMITS.nameMax, 'Máximo 30 caracteres.'),
    option2Values: z.string(),
    colorNote: z.string().trim().max(VARIANT_LIMITS.noteMax, 'Máximo 60 caracteres.'),
  })
  .superRefine((values, ctx) => {
    const first = parseOptionValues(values.option1Values);
    const second = values.hasColors ? parseOptionValues(values.option2Values) : [];
    for (const [path, list] of [
      ['option1Values', first],
      ['option2Values', second],
    ] as const) {
      const long = list.find((value) => value.length > VARIANT_LIMITS.valueMax);
      if (long) {
        ctx.addIssue({ code: 'custom', path: [path], message: `"${long}" pasa de 40 caracteres.` });
      }
      // The SKU uses each value without accents or symbols: it needs letters or numbers, and two
      // values must not give the same SKU ("M" and "m").
      const blank = list.find((value) => slugify(value) === '');
      if (blank) {
        ctx.addIssue({
          code: 'custom',
          path: [path],
          message: `"${blank}" necesita letras o números.`,
        });
      }
      const seen = new Map<string, string>();
      for (const value of list) {
        const key = slugify(value);
        const other = seen.get(key);
        if (key && other) {
          ctx.addIssue({
            code: 'custom',
            path: [path],
            message: `"${other}" y "${value}" darían el mismo SKU.`,
          });
          break;
        }
        seen.set(key, value);
      }
    }
    if (values.hasColors && values.option2Name === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['option2Name'],
        message: 'Escribe el nombre de la opción, por ejemplo Color.',
      });
    }
    if (values.hasColors && second.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['option2Values'],
        message: 'Escribe al menos un color o quita "Tiene colores".',
      });
    }
    if (Math.max(first.length, 1) * Math.max(second.length, 1) > VARIANT_LIMITS.maxVariants) {
      ctx.addIssue({
        code: 'custom',
        path: ['option1Values'],
        message: 'Son demasiadas combinaciones: el máximo es 200 variantes.',
      });
    }
  });

export type VariantsForm = z.input<typeof VariantsFormSchema>;

/** Arguments of admin_save_variants (text columns travel as '' when empty). */
export function variantsPayload(productId: string, values: VariantsForm) {
  return {
    product_id: productId,
    option1_name: values.option1Name.trim(),
    option2_name: values.hasColors ? values.option2Name.trim() : '',
    color_note: values.hasColors ? '' : values.colorNote.trim(),
    option1: parseOptionValues(values.option1Values),
    option2: values.hasColors ? parseOptionValues(values.option2Values) : [],
  };
}

export type ReplaceResult = { created: number; kept: number; deactivated: number };

/** "2 nuevas, 3 se conservan y 1 desactivada." */
export function replaceSummary({ created, kept, deactivated }: ReplaceResult): string {
  const parts = [
    created ? `${created} ${created === 1 ? 'nueva' : 'nuevas'}` : null,
    kept ? `${kept} ${kept === 1 ? 'se conserva' : 'se conservan'}` : null,
    deactivated ? `${deactivated} ${deactivated === 1 ? 'desactivada' : 'desactivadas'}` : null,
  ].filter((part): part is string => !!part);
  if (parts.length === 0) return 'Sin cambios.';
  const last = parts.pop()!;
  return `${parts.length ? `${parts.join(', ')} y ${last}` : last}.`;
}
