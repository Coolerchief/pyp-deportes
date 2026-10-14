// Quote request validation (docs/05-BACKEND-SCHEMA.md §9.1), shared by the quote form (React
// Hook Form) and the submit-quote Edge Function. Messages follow docs/03-UI-UX.md §10.

import { z } from 'zod';
import { addYears, isIsoDate, mexicoCityDate } from './dates.ts';
import { CUSTOMER_TYPES, DELIVERY_METHODS } from './labels.ts';
import { digitsOnly } from './text.ts';

export const QUOTE_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  organizationMax: 120,
  noteMax: 1000,
  itemsMax: 100,
  quantityMax: 9999,
  itemNotesMax: 500,
  neededByMaxYears: 2,
} as const;

/** Field names used in the error summary ("Faltan 3 datos…: nombre, WhatsApp y …"). */
export const quoteFieldLabels = {
  name: 'nombre',
  phone: 'WhatsApp',
  type: 'tipo de cliente',
  organization: 'nombre del equipo o institución',
  neededBy: 'fecha',
  deliveryMethod: 'forma de entrega',
  note: 'nota',
  privacyAccepted: 'aviso de privacidad',
} as const;
export type QuoteField = keyof typeof quoteFieldLabels;

type SchemaOptions = {
  /** Clock used for the "from today" date rule; injectable for tests. */
  now?: () => Date;
};

/** Requester data: the fields of the quote form (step 2 of the quote flow). */
export function createQuoteRequesterSchema({ now = () => new Date() }: SchemaOptions = {}) {
  return z.object({
    customer: z.object({
      name: z
        .string()
        .trim()
        .min(QUOTE_LIMITS.nameMin, 'Escribe tu nombre.')
        .max(QUOTE_LIMITS.nameMax, `Usa máximo ${QUOTE_LIMITS.nameMax} caracteres.`),
      // Spaces and dashes typed in the field are ignored; it must end up as 10 digits, no +52.
      phone: z
        .string()
        .transform(digitsOnly)
        .pipe(z.string().regex(/^\d{10}$/, 'Faltan dígitos: deben ser 10.')),
      type: z.enum(CUSTOMER_TYPES, 'Elige qué tipo de cliente eres.'),
      organization: z
        .string()
        .trim()
        .max(QUOTE_LIMITS.organizationMax, `Usa máximo ${QUOTE_LIMITS.organizationMax} caracteres.`)
        .optional()
        .transform((value) => (value ? value : undefined)),
    }),
    neededBy: z
      .string()
      .refine(isIsoDate, '¿Para cuándo lo necesitas? Elige una fecha.')
      .superRefine((value, ctx) => {
        if (!isIsoDate(value)) return;
        const today = mexicoCityDate(now());
        if (value < today) {
          ctx.addIssue({ code: 'custom', message: 'Elige una fecha de hoy en adelante.' });
        } else if (value > addYears(today, QUOTE_LIMITS.neededByMaxYears)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Elige una fecha dentro de los próximos 2 años.',
          });
        }
      }),
    deliveryMethod: z.enum(DELIVERY_METHODS, 'Elige cómo quieres recibirlo.'),
    requiresInvoice: z.boolean().default(false),
    note: z
      .string()
      .trim()
      .max(QUOTE_LIMITS.noteMax, `Usa máximo ${QUOTE_LIMITS.noteMax} caracteres.`)
      .default(''),
    privacyAccepted: z.literal(true, 'Acepta el aviso de privacidad para enviar.'),
    privacyVersion: z.string().min(1),
  });
}

export const QuoteItemSchema = z.object({
  variantId: z.uuid(),
  quantity: z
    .number()
    .int('Usa números enteros.')
    .min(1, 'Indica al menos 1 pieza.')
    .max(QUOTE_LIMITS.quantityMax, `Máximo ${QUOTE_LIMITS.quantityMax} piezas por talla.`),
  personalize: z.boolean().default(false),
  notes: z
    .string()
    .trim()
    .max(QUOTE_LIMITS.itemNotesMax, `Usa máximo ${QUOTE_LIMITS.itemNotesMax} caracteres.`)
    .default(''),
});

/** Body of POST /functions/v1/submit-quote. */
export function createQuoteSubmissionSchema(options: SchemaOptions = {}) {
  return createQuoteRequesterSchema(options).extend({
    clientRequestId: z.uuid(),
    turnstileToken: z.string().min(1),
    items: z
      .array(QuoteItemSchema)
      .min(1, 'Tu lista está vacía.')
      .max(QUOTE_LIMITS.itemsMax, `Máximo ${QUOTE_LIMITS.itemsMax} líneas por cotización.`),
  });
}

export const QuoteRequesterSchema = createQuoteRequesterSchema();
export const QuoteSubmissionSchema = createQuoteSubmissionSchema();
export type QuoteRequesterInput = z.input<typeof QuoteRequesterSchema>;
export type QuoteRequester = z.output<typeof QuoteRequesterSchema>;
export type QuoteSubmissionInput = z.input<typeof QuoteSubmissionSchema>;
export type QuoteSubmission = z.output<typeof QuoteSubmissionSchema>;
export type QuoteItem = z.output<typeof QuoteItemSchema>;

/** Form field of a validation issue path, e.g. ['customer', 'phone'] → 'phone'. */
export function quoteFieldOf(path: readonly PropertyKey[]): QuoteField | null {
  const key = path[0] === 'customer' ? path[1] : path[0];
  return typeof key === 'string' && key in quoteFieldLabels ? (key as QuoteField) : null;
}

/** Spanish list: ['a'] → 'a'; ['a', 'b', 'c'] → 'a, b y c'. */
function joinSpanish(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

/**
 * Error summary above the form (UI/UX §10): "Faltan 3 datos para enviar tu cotización: nombre,
 * WhatsApp y aviso de privacidad." Fields follow the form order and are listed once.
 */
export function quoteErrorSummary(fields: readonly QuoteField[]): string {
  const order = Object.keys(quoteFieldLabels) as QuoteField[];
  const unique = order.filter((field) => fields.includes(field));
  const count = unique.length;
  const lead = count === 1 ? 'Falta 1 dato' : `Faltan ${count} datos`;
  return `${lead} para enviar tu cotización: ${joinSpanish(
    unique.map((field) => quoteFieldLabels[field]),
  )}.`;
}
