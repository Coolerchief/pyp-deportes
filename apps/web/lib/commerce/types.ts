// Domain boundary towards e-commerce (TRD §19.1). Stable interfaces; v1 only has the "catalog"
// implementation: the cart is the quote list, prices are always null and checkout is WhatsApp.

import type { QuoteAddition, QuoteLine } from '@pyp/shared';

/** 'catalog' today; 'store' once settings.flags.enable_checkout is on (TRD §19.2). */
export type CommerceMode = 'catalog' | 'store';

export type Money = { amount: number; currency: 'MXN' };

/** Today: the quote list (useQuote). Tomorrow: the cart, with the same line shape. */
export interface CartService {
  lines(): QuoteLine[];
  add(addition: QuoteAddition): { added: string[]; skipped: number };
  update(lineId: string, quantity: number): void;
  remove(lineIds: string[]): void;
  clear(): void;
}

/** Today: always null (the site shows no prices while show_prices is off). */
export interface PricingService {
  priceFor(variantId: string, quantity: number): Money | null;
}

/** What gets sent: the lines as they are when the visitor submits. */
export type CartSnapshot = { lines: QuoteLine[] };

export type SubmitResult =
  { status: 'saved'; folio: string } | { status: 'unsaved'; reason: string };

/** Today: WhatsAppQuoteCheckout (T3.8); later a payment provider. */
export interface CheckoutProvider<Customer = unknown> {
  submit(cart: CartSnapshot, customer: Customer): Promise<SubmitResult>;
}
