import {
  buildWaUrl,
  type CatalogJson,
  type QuoteItem,
  type QuoteLine,
  type QuoteRequester,
} from '@pyp/shared';
import { quoteMessageInput } from './quote-message';

/** The whole wait for the function (TRD §6.4): after this, WhatsApp opens without folio. */
export const SUBMIT_TIMEOUT_MS = 6000;

export type SubmitFailure =
  'turnstile' | 'timeout' | 'network' | 'rate_limited' | 'server' | 'not_configured';

export type SubmitResult =
  | { kind: 'saved'; folio: string }
  | { kind: 'invalid_items'; variantIds: string[] }
  | { kind: 'failed'; reason: SubmitFailure };

type Env = Record<string, string | undefined>;

/** {NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-quote, or null when the build has no URL. */
export function submitQuoteEndpoint(
  url: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  const base = url?.trim().replace(/\/+$/, '');
  return base ? `${base}/functions/v1/submit-quote` : null;
}

/** The public Turnstile key the build was made with, or null. */
export function turnstileSiteKey(
  env: Env = { NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY },
): string | null {
  return env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

/** Body of POST submit-quote (Schema §9.1). */
export function submissionBody(
  requester: QuoteRequester,
  items: QuoteItem[],
  clientRequestId: string,
  turnstileToken: string,
) {
  return {
    clientRequestId,
    turnstileToken,
    customer: requester.customer,
    neededBy: requester.neededBy,
    deliveryMethod: requester.deliveryMethod,
    requiresInvoice: requester.requiresInvoice,
    note: requester.note,
    privacyAccepted: requester.privacyAccepted,
    privacyVersion: requester.privacyVersion,
    items,
  };
}

/**
 * POST to submit-quote with a 6 s limit. Never throws: anything but a folio or a 409 is a
 * failure, and the caller opens WhatsApp without folio (rule 5).
 */
export async function postQuote(
  endpoint: string,
  body: unknown,
  { fetch: doFetch = fetch, timeoutMs = SUBMIT_TIMEOUT_MS } = {},
): Promise<SubmitResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as {
      folio?: unknown;
      fields?: { items?: unknown };
    } | null;
    if ((response.status === 200 || response.status === 201) && typeof data?.folio === 'string') {
      return { kind: 'saved', folio: data.folio };
    }
    if (response.status === 409) {
      const items = data?.fields?.items;
      return { kind: 'invalid_items', variantIds: Array.isArray(items) ? items.map(String) : [] };
    }
    if (response.status === 403 && JSON.stringify(data).includes('turnstile')) {
      return { kind: 'failed', reason: 'turnstile' };
    }
    return { kind: 'failed', reason: response.status === 429 ? 'rate_limited' : 'server' };
  } catch {
    return { kind: 'failed', reason: controller.signal.aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export type SendQuoteInput = {
  lines: readonly QuoteLine[];
  requester: QuoteRequester;
  catalog: CatalogJson | null;
  /** settings.whatsappSalesNumber (10 digits). */
  whatsappNumber: string;
  clientRequestId: string;
  endpoint: string | null;
  takeToken: (timeoutMs: number) => Promise<string>;
  post?: typeof postQuote;
};

export type SendQuoteOutcome = {
  result: SubmitResult;
  /** null only for 409: the visitor goes back to the list instead of WhatsApp. */
  waUrl: string | null;
};

/**
 * The whole send (TRD §6.4): Turnstile token → POST (6 s) → the WhatsApp link with the folio,
 * or without it when anything failed. A 409 gives no link: the list has to change first.
 */
export async function sendQuote({
  lines,
  requester,
  catalog,
  whatsappNumber,
  clientRequestId,
  endpoint,
  takeToken,
  post = postQuote,
}: SendQuoteInput): Promise<SendQuoteOutcome> {
  const link = (folio: string | null) =>
    buildWaUrl(whatsappNumber, quoteMessageInput(lines, requester, folio, catalog)).url;

  if (!endpoint) return { result: { kind: 'failed', reason: 'not_configured' }, waUrl: link(null) };

  let token: string;
  try {
    token = await takeToken(SUBMIT_TIMEOUT_MS);
  } catch {
    return { result: { kind: 'failed', reason: 'turnstile' }, waUrl: link(null) };
  }

  const items: QuoteItem[] = lines.map((line) => ({
    variantId: line.variantId,
    quantity: line.quantity,
    personalize: line.personalize,
    notes: line.notes,
  }));
  const result = await post(endpoint, submissionBody(requester, items, clientRequestId, token));
  if (result.kind === 'saved') return { result, waUrl: link(result.folio) };
  if (result.kind === 'invalid_items') return { result, waUrl: null };
  return { result, waUrl: link(null) };
}
