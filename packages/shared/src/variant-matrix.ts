// Quantity matrix of the product page (T3.2, UI/UX §7.5): how the variants become rows, the
// "Equipo de 12 / 18 / 24" shortcuts and the totals.

import type { CatalogProduct } from './catalog.ts';
import { QUOTE_LIMITS } from './quote.ts';
import { normalizeText, variantLabel } from './text.ts';

export type MatrixRow = { variantId: string; label: string };

export type MatrixLayout = {
  /** "talla", "tamaño", "peso", "color"… for "Cantidad por talla" and the empty message. */
  dimension: string;
  /** Two dimensions: a color selector, and the sizes of the selected color. */
  colors: { name: string; rows: MatrixRow[] }[] | null;
  /** One dimension (or none): the rows straight away. */
  rows: MatrixRow[];
  /** A single color shared by every variant ("Color: Blanco/Azul"). */
  fixedColor: string | null;
};

const lower = (word: string | null | undefined, fallback: string) =>
  (word ?? fallback).trim().toLowerCase() || fallback;

/**
 * Rows of the matrix from the variants, in their order:
 *  · sizes and several colors → color selector, sizes per color;
 *  · sizes only (or one color for all) → one row per size;
 *  · colors only → one row per color;
 *  · only the default variant → one row "Piezas".
 */
export function matrixLayout(
  product: Pick<CatalogProduct, 'option1Name' | 'option2Name' | 'variants'>,
): MatrixLayout {
  const { variants } = product;
  const o1 = new Set(variants.map((v) => v.o1).filter(Boolean));
  const o2 = [...new Set(variants.map((v) => v.o2).filter((v): v is string => !!v))];

  if (o1.size > 0 && o2.length > 1) {
    return {
      dimension: lower(product.option1Name, 'talla'),
      colors: o2.map((name) => ({
        name,
        rows: variants
          .filter((v) => v.o2 === name)
          .map((v) => ({ variantId: v.id, label: v.o1 ?? name })),
      })),
      rows: [],
      fixedColor: null,
    };
  }
  if (o1.size > 0) {
    return {
      dimension: lower(product.option1Name, 'talla'),
      colors: null,
      rows: variants.map((v) => ({ variantId: v.id, label: v.o1 ?? '—' })),
      fixedColor: o2.length === 1 ? (o2[0] as string) : null,
    };
  }
  if (o2.length > 0) {
    return {
      dimension: lower(product.option2Name, 'color'),
      colors: null,
      rows: variants.map((v) => ({ variantId: v.id, label: variantLabel(v.o1, v.o2) ?? '—' })),
      fixedColor: null,
    };
  }
  return {
    dimension: 'pieza',
    colors: null,
    rows: variants.map((v) => ({ variantId: v.id, label: 'Piezas' })),
    fixedColor: null,
  };
}

/** Team sizes the shortcuts use when the product has them (as in the design). */
export const TEAM_CORE_SIZES = ['CH', 'M', 'G', 'XG'];
export const TEAM_PRESETS = [12, 18, 24] as const;

/**
 * "Equipo de 12 / 18 / 24": spreads the pieces over the adult sizes CH, M, G and XG when the
 * product has them (1 : 2 : 2 : 1, so 12 → 2, 4, 4, 2), or over all its sizes otherwise, always
 * weighting the middle sizes more. Rounding keeps the exact total. Returns size → pieces.
 */
export function teamPreset(sizes: readonly string[], total: number): Map<string, number> {
  const core = sizes.filter((s) => TEAM_CORE_SIZES.includes(normalizeText(s).toUpperCase()));
  const target = core.length > 0 ? core : [...sizes];
  const k = target.length;
  const result = new Map<string, number>(sizes.map((s) => [s, 0]));
  if (k === 0 || total <= 0) return result;
  const weights = target.map((_, i) => Math.min(i + 1, k - i));
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (total * w) / sum);
  const floors = exact.map(Math.floor);
  let left = total - floors.reduce((a, b) => a + b, 0);
  // Largest remainders first; ties go to the middle sizes (higher weight), then the first.
  const order = exact
    .map((value, i) => ({ i, rest: value - Math.floor(value), w: weights[i] as number }))
    .sort((a, b) => b.rest - a.rest || b.w - a.w || a.i - b.i);
  for (const { i } of order) {
    if (left === 0) break;
    floors[i] = (floors[i] as number) + 1;
    left -= 1;
  }
  target.forEach((size, i) => result.set(size, floors[i] as number));
  return result;
}

/** A typed or stepped quantity: whole number between 0 and 9 999 (anything else → 0). */
export function cleanQuantity(value: string | number): number {
  const n = typeof value === 'number' ? value : Number.parseInt(value.replace(/\D/g, ''), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(QUOTE_LIMITS.quantityMax, Math.floor(n));
}

/** "6 pzs", "1 pza" or "—" next to each row; "1 pieza" / "18 piezas" for the total. */
export function rowPieces(quantity: number): string {
  if (quantity <= 0) return '—';
  return `${quantity} ${quantity === 1 ? 'pza' : 'pzs'}`;
}
export function piecesText(total: number): string {
  return `${total} ${total === 1 ? 'pieza' : 'piezas'}`;
}
