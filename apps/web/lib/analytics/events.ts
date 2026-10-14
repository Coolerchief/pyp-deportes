// Funnel events (TRD §12, APP-FLOW §6). GA4 e-commerce names where they exist, so the reports
// keep working when there is a real cart.

/** Where a WhatsApp exit comes from (APP-FLOW §6). */
export type WhatsAppOrigin =
  | 'floating'
  | 'product'
  | 'confirmation'
  | 'quote'
  | 'menu'
  | 'uniforms'
  | 'gallery'
  | 'search'
  | 'home'
  | 'listing'
  | 'other';

/** The `items[]` shape of GA4 (TRD §12): item_id is the SKU. */
export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  quantity?: number;
  index?: number;
};

export type SubmitErrorReason =
  | 'turnstile'
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'server'
  | 'not_configured'
  | 'invalid_items';

export type AnalyticsEvents = {
  view_item: { items: AnalyticsItem[] };
  view_item_list: { item_list_id: string; item_list_name: string; items: AnalyticsItem[] };
  search: { search_term: string; results: number };
  add_to_quote: { items: AnalyticsItem[]; pieces: number };
  view_quote: { items: AnalyticsItem[]; products: number; pieces: number };
  begin_quote_form: { items: AnalyticsItem[]; products: number; pieces: number };
  submit_quote: {
    folio: string;
    items: AnalyticsItem[];
    products: number;
    pieces: number;
    customer_type: string;
  };
  quote_submit_error: { reason: SubmitErrorReason };
  whatsapp_click: { origin: WhatsAppOrigin };
};

export type AnalyticsEvent = keyof AnalyticsEvents;

/** Our names → the GA4 recommended event also sent (TRD §12). */
export const GA4_ALIASES: Partial<Record<AnalyticsEvent, string>> = {
  add_to_quote: 'add_to_cart',
  begin_quote_form: 'begin_checkout',
  submit_quote: 'generate_lead',
};

/** A list never sends more than this many items (GA4 caps items[] at 200). */
export const MAX_ITEMS = 50;

type ProductLike = {
  sku: string;
  name: string;
  brand?: { name: string } | null;
};

/** A product as a GA4 item; brand and category names when known. */
export function analyticsItem(
  product: ProductLike,
  extra: { category?: string; variant?: string | null; quantity?: number; index?: number } = {},
): AnalyticsItem {
  return {
    item_id: product.sku,
    item_name: product.name,
    ...(product.brand?.name && { item_brand: product.brand.name }),
    ...(extra.category && { item_category: extra.category }),
    ...(extra.variant && { item_variant: extra.variant }),
    ...(extra.quantity !== undefined && { quantity: extra.quantity }),
    ...(extra.index !== undefined && { index: extra.index }),
  };
}

type QuoteLineLike = {
  quantity: number;
  snapshot: { name: string; sku: string; variantLabel: string | null };
};

/** The quote list as items: one per line (variant), with its pieces. */
export function quoteItems(lines: readonly QuoteLineLike[]): AnalyticsItem[] {
  return lines.slice(0, MAX_ITEMS).map((line) =>
    analyticsItem(line.snapshot, {
      variant: line.snapshot.variantLabel,
      quantity: line.quantity,
    }),
  );
}

/** wa.me links only: the delegated click tracker ignores every other link. */
export function isWhatsAppHref(href: string | null | undefined): boolean {
  return !!href && /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href);
}

const GA_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;

/** A GA4 measurement ID, or null when missing or malformed (it goes into an inline script). */
export function gaMeasurementId(value: string | undefined): string | null {
  const id = value?.trim() ?? '';
  return GA_ID_PATTERN.test(id) ? id : null;
}
