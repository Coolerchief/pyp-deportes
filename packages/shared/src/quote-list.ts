// The quote list in the browser (T3.1, TRD §6.3, APP-FLOW §4.1 and §4.5): pure rules the
// useQuote store applies. A line has the same shape as the future cart line (TRD §19).

import { z } from 'zod';
import { QUOTE_LIMITS } from './quote';

/** localStorage key and version of the saved list; a new shape means a new version. */
export const QUOTE_STORAGE_KEY = 'pyp.quote.v1';
export const QUOTE_STORAGE_VERSION = 1;
/** A list untouched for this long is discarded when the site loads (APP-FLOW §4.5). */
export const QUOTE_MAX_AGE_DAYS = 30;

export const QUOTE_MESSAGES = {
  linesLimit: `Tu lista llegó al máximo de ${QUOTE_LIMITS.itemsMax} renglones. Envíala y arma otra para el resto.`,
  noStorage: 'Tu lista no se guardará si cierras esta página.',
} as const;

export const QuoteLineSchema = z.object({
  lineId: z.string().min(1),
  productId: z.uuid(),
  /** Always set: a product "without variants" has its default variant (rule 11). */
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(QUOTE_LIMITS.quantityMax),
  personalize: z.boolean(),
  notes: z.string().max(QUOTE_LIMITS.itemNotesMax),
  /** To paint the list without the network; checked again when sending. */
  snapshot: z.object({
    name: z.string(),
    sku: z.string(),
    slug: z.string(),
    /** null for the default variant. */
    variantLabel: z.string().nullable(),
    /** key_base of the product photo in R2, or null for the generic image. */
    image: z.string().nullable(),
  }),
  addedAt: z.string(),
});
export type QuoteLine = z.output<typeof QuoteLineSchema>;

export type QuoteState = { lines: QuoteLine[]; updatedAt: string | null };
export const EMPTY_QUOTE: QuoteState = { lines: [], updatedAt: null };

/** What "Agregar a mi cotización" sends: one entry per variant of one product. */
export type QuoteAddition = {
  productId: string;
  personalize: boolean;
  notes: string;
  /** Product data copied into each line's snapshot. */
  product: { name: string; sku: string; slug: string; image: string | null };
  variants: { variantId: string; label: string | null; quantity: number }[];
};

export type AddResult = {
  state: QuoteState;
  /** Line ids created or increased, for the "added" notice. */
  added: string[];
  /** Variants left out because the list hit 100 lines. */
  skipped: number;
};

const clampQuantity = (quantity: number) =>
  Math.min(QUOTE_LIMITS.quantityMax, Math.max(0, Math.floor(quantity)));

const cleanNotes = (notes: string) => notes.trim().slice(0, QUOTE_LIMITS.itemNotesMax);

/**
 * Adds a product to the list (APP-FLOW §4.1): one line per variant with quantity above 0. A
 * variant already in the list adds up (capped at 9 999); a new non-empty note replaces the old
 * one. New lines stop at 100 and the rest are reported as skipped.
 */
export function addToQuote(
  state: QuoteState,
  addition: QuoteAddition,
  now: string,
  newId: () => string,
): AddResult {
  const lines = [...state.lines];
  const added: string[] = [];
  let skipped = 0;
  const notes = cleanNotes(addition.notes);

  for (const variant of addition.variants) {
    const quantity = clampQuantity(variant.quantity);
    if (quantity === 0) continue;
    const index = lines.findIndex((l) => l.variantId === variant.variantId);
    if (index >= 0) {
      const line = lines[index] as QuoteLine;
      lines[index] = {
        ...line,
        quantity: Math.min(QUOTE_LIMITS.quantityMax, line.quantity + quantity),
        personalize: addition.personalize || line.personalize,
        notes: notes || line.notes,
      };
      added.push(line.lineId);
      continue;
    }
    if (lines.length >= QUOTE_LIMITS.itemsMax) {
      skipped += 1;
      continue;
    }
    const lineId = newId();
    lines.push({
      lineId,
      productId: addition.productId,
      variantId: variant.variantId,
      quantity,
      personalize: addition.personalize,
      notes,
      snapshot: { ...addition.product, variantLabel: variant.label },
      addedAt: now,
    });
    added.push(lineId);
  }
  const changed = added.length > 0;
  return { state: changed ? { lines, updatedAt: now } : state, added, skipped };
}

/** Sets a line's quantity (1–9 999); 0 or less removes nothing here: use removeLines. */
export function setQuantity(
  state: QuoteState,
  lineId: string,
  quantity: number,
  now: string,
): QuoteState {
  const value = Math.max(1, clampQuantity(quantity));
  return {
    lines: state.lines.map((l) => (l.lineId === lineId ? { ...l, quantity: value } : l)),
    updatedAt: now,
  };
}

/** Removes lines and returns them with their positions, so "Deshacer" can put them back. */
export function removeLines(
  state: QuoteState,
  lineIds: readonly string[],
  now: string,
): { state: QuoteState; removed: { line: QuoteLine; index: number }[] } {
  const removed = state.lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => lineIds.includes(line.lineId));
  return {
    state: { lines: state.lines.filter((l) => !lineIds.includes(l.lineId)), updatedAt: now },
    removed,
  };
}

/** "Deshacer": puts removed lines back where they were (skipping any already present). */
export function restoreLines(
  state: QuoteState,
  removed: readonly { line: QuoteLine; index: number }[],
  now: string,
): QuoteState {
  const lines = [...state.lines];
  for (const { line, index } of [...removed].sort((a, b) => a.index - b.index)) {
    if (lines.some((l) => l.lineId === line.lineId || l.variantId === line.variantId)) continue;
    if (lines.length >= QUOTE_LIMITS.itemsMax) break;
    lines.splice(Math.min(index, lines.length), 0, line);
  }
  return { lines, updatedAt: now };
}

/** "Editar personalización" (TRD §6.3): updates every line of the product. */
export function setPersonalization(
  state: QuoteState,
  productId: string,
  personalize: boolean,
  notes: string,
  now: string,
): QuoteState {
  const text = personalize ? cleanNotes(notes) : '';
  return {
    lines: state.lines.map((l) =>
      l.productId === productId ? { ...l, personalize, notes: text } : l,
    ),
    updatedAt: now,
  };
}

/** Pieces (the header counter counts pieces, not lines) and distinct products. */
export function quoteTotals(lines: readonly QuoteLine[]): { pieces: number; products: number } {
  return {
    pieces: lines.reduce((sum, l) => sum + l.quantity, 0),
    products: new Set(lines.map((l) => l.productId)).size,
  };
}

/** Pieces of one product already in the list ("En tu cotización · 12 piezas"). */
export function piecesOf(lines: readonly QuoteLine[], productId: string): number {
  return lines.filter((l) => l.productId === productId).reduce((sum, l) => sum + l.quantity, 0);
}

/** Lines whose product is no longer published: marked "No disponible", never dropped quietly. */
export function unavailableLineIds(
  lines: readonly QuoteLine[],
  publishedProductIds: ReadonlySet<string>,
): Set<string> {
  return new Set(lines.filter((l) => !publishedProductIds.has(l.productId)).map((l) => l.lineId));
}

/**
 * Reads what localStorage holds (any version, any shape). Unknown versions, broken data and
 * lists older than 30 days start empty; invalid lines are dropped one by one.
 */
export function restoreQuote(saved: unknown, version: number, now: string): QuoteState {
  if (version !== QUOTE_STORAGE_VERSION || !saved || typeof saved !== 'object') return EMPTY_QUOTE;
  const { lines, updatedAt } = saved as { lines?: unknown; updatedAt?: unknown };
  if (typeof updatedAt !== 'string' || !Array.isArray(lines)) return EMPTY_QUOTE;
  const age = new Date(now).getTime() - new Date(updatedAt).getTime();
  if (!(age >= 0 && age <= QUOTE_MAX_AGE_DAYS * 86_400_000)) return EMPTY_QUOTE;
  const valid = lines
    .map((line) => QuoteLineSchema.safeParse(line))
    .filter((r) => r.success)
    .map((r) => r.data)
    .slice(0, QUOTE_LIMITS.itemsMax);
  return { lines: valid, updatedAt };
}
