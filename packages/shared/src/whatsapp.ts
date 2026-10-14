// The quote message sent to WhatsApp (T3.6, TRD §6.5): full, compact (long lists with a folio)
// and without folio (the fallback when saving fails, rule 5).

import { whatsappUrl } from './contact';
import { customerTypeLabels, type CustomerType, type DeliveryMethod } from './labels';

/** Above this URL length the compact format is used (only with a folio). */
export const WA_URL_MAX = 4000;

export type QuoteMessageLine = {
  /** "M", "5 · Blanco/Rojo", or null for the default variant. */
  label: string | null;
  quantity: number;
  /** The variant's SKU; used when the product has a single line. */
  sku?: string;
};

export type QuoteMessageProduct = {
  name: string;
  /** Product SKU. */
  sku: string;
  lines: QuoteMessageLine[];
  personalize: boolean;
  notes: string;
};

export type QuoteMessageInput = {
  folio: string | null;
  customer: { name: string; type: CustomerType; organization?: string };
  /** YYYY-MM-DD. */
  neededBy: string;
  deliveryMethod: DeliveryMethod;
  requiresInvoice: boolean;
  note: string;
  products: QuoteMessageProduct[];
};

const DELIVERY: Record<DeliveryMethod, string> = {
  pickup: 'Recoger en tienda',
  shipping: 'Envío',
};

/** "2026-10-15" → "15/10/2026". */
function dayMonthYear(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Labels read better without the middle dot inside a line: "5 · Blanco/Rojo" → "5 Blanco/Rojo". */
const plainLabel = (label: string) => label.replace(/\s·\s/g, ' ');

const piecesOf = (product: QuoteMessageProduct) =>
  product.lines.reduce((sum, line) => sum + line.quantity, 0);

function header(input: QuoteMessageInput): string[] {
  const { customer } = input;
  return [
    input.folio ? `¡Hola! Quiero cotizar. Folio *${input.folio}*` : '¡Hola! Quiero cotizar.',
    '',
    `*Cliente:* ${customer.name} · ${customerTypeLabels[customer.type]}`,
    ...(customer.organization ? [`*Equipo/institución:* ${customer.organization}`] : []),
    `*Lo necesito para:* ${dayMonthYear(input.neededBy)}`,
    `*Entrega:* ${DELIVERY[input.deliveryMethod]} · *Factura:* ${input.requiresInvoice ? 'Sí' : 'No'}`,
  ];
}

function productsTitle(input: QuoteMessageInput): string {
  const pieces = input.products.reduce((sum, p) => sum + piecesOf(p), 0);
  return `*Productos (${input.products.length} · ${pieces} piezas)*`;
}

/** "Uniforme (UNI-001) — 20 pzs", or with its only variant: "Balón #5 Blanco/Rojo (BAL-…) — 12 pzs". */
function productLine(product: QuoteMessageProduct, index: number): string {
  const [only] = product.lines;
  const single = product.lines.length === 1 && only;
  const name = single && only.label ? `${product.name} ${plainLabel(only.label)}` : product.name;
  const sku = single && only.sku ? only.sku : product.sku;
  const pieces = piecesOf(product);
  return `${index + 1}. ${name} (${sku}) — ${pieces} ${pieces === 1 ? 'pza' : 'pzs'}`;
}

/** Full format (TRD §6.5): every product with its pieces per size and its personalization. */
export function buildQuoteMessage(input: QuoteMessageInput): string {
  const lines = [...header(input), '', productsTitle(input)];
  input.products.forEach((product, index) => {
    lines.push(productLine(product, index));
    if (product.lines.length > 1) {
      lines.push(
        `   ${product.lines.map((l) => `${plainLabel(l.label ?? 'Piezas')} ${l.quantity}`).join(' · ')}`,
      );
    }
    if (product.personalize) {
      lines.push(`   ✎ Personalizar: ${product.notes.trim() || 'por definir'}`);
    }
  });
  if (input.note.trim()) lines.push('', `*Nota:* ${input.note.trim()}`);
  return lines.join('\n');
}

/**
 * Compact format for long lists (only with a folio): the header and one line per product with
 * its total; the sizes and notes stay in the folio. If even that is too long, the last products
 * are summed up as "… y n productos más".
 */
export function buildCompactQuoteMessage(input: QuoteMessageInput, number: string): string {
  const build = (shown: number) => {
    const rest = input.products.length - shown;
    return [
      ...header(input),
      '',
      productsTitle(input),
      ...input.products.slice(0, shown).map(productLine),
      ...(rest > 0 ? [`… y ${rest} ${rest === 1 ? 'producto' : 'productos'} más`] : []),
      '',
      `Detalle completo en el folio *${input.folio}*.`,
    ].join('\n');
  };
  for (let shown = input.products.length; shown > 0; shown--) {
    const message = build(shown);
    if (whatsappUrl(number, message).length <= WA_URL_MAX) return message;
  }
  return build(0);
}

export type QuoteWhatsApp = { url: string; message: string; format: 'full' | 'compact' };

/**
 * The wa.me link to send the quote. With a folio, the full message when its URL fits in 4 000
 * characters and the compact one otherwise; without a folio, always the full one (nothing was
 * saved, so the message must carry everything).
 */
export function buildWaUrl(number: string, input: QuoteMessageInput): QuoteWhatsApp {
  const full = buildQuoteMessage(input);
  const url = whatsappUrl(number, full);
  if (!input.folio || url.length <= WA_URL_MAX) return { url, message: full, format: 'full' };
  const compact = buildCompactQuoteMessage(input, number);
  return { url: whatsappUrl(number, compact), message: compact, format: 'compact' };
}
