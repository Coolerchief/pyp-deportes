import type { QuoteLine, QuoteRequester } from '@pyp/shared';
import { describe, expect, it, vi } from 'vitest';
import {
  postQuote,
  sendQuote,
  submissionBody,
  submitQuoteEndpoint,
  turnstileSiteKey,
} from './submit-quote';

const ENDPOINT = 'https://pyp-dev.supabase.co/functions/v1/submit-quote';
const VARIANT = '00000000-0000-4000-8000-000000000101';

const requester: QuoteRequester = {
  customer: { name: 'Ana López', phone: '5512345678', type: 'school_academy', organization: 'Sur' },
  neededBy: '2026-10-21',
  deliveryMethod: 'pickup',
  requiresInvoice: false,
  note: '',
  privacyAccepted: true,
  privacyVersion: '2026-10',
};

const lines: QuoteLine[] = [
  {
    lineId: 'l1',
    productId: '00000000-0000-4000-8000-000000000001',
    variantId: VARIANT,
    quantity: 12,
    personalize: true,
    notes: 'Escudo',
    snapshot: { name: 'Balón', sku: 'BAL-005', slug: 'balon', variantLabel: '#5', image: null },
    addedAt: '2026-10-14T00:00:00.000Z',
  },
];

const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('endpoint and keys', () => {
  it('builds the function URL from NEXT_PUBLIC_SUPABASE_URL', () => {
    expect(submitQuoteEndpoint('https://pyp-dev.supabase.co/')).toBe(ENDPOINT);
    expect(submitQuoteEndpoint('')).toBeNull();
    expect(submitQuoteEndpoint(undefined)).toBeNull();
    expect(turnstileSiteKey({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: ' 1x00000000000000000000AA ' })).toBe(
      '1x00000000000000000000AA',
    );
    expect(turnstileSiteKey({})).toBeNull();
  });

  it('sends the body of Schema §9.1', () => {
    expect(submissionBody(requester, [], 'id', 'token')).toEqual({
      clientRequestId: 'id',
      turnstileToken: 'token',
      customer: requester.customer,
      neededBy: '2026-10-21',
      deliveryMethod: 'pickup',
      requiresInvoice: false,
      note: '',
      privacyAccepted: true,
      privacyVersion: '2026-10',
      items: [],
    });
  });
});

describe('postQuote', () => {
  it('reads the folio of 201 and of a 200 retry', async () => {
    expect(
      await postQuote(ENDPOINT, {}, { fetch: respond(201, { folio: 'PYP-2026-000123' }) }),
    ).toEqual({
      kind: 'saved',
      folio: 'PYP-2026-000123',
    });
    expect(
      await postQuote(
        ENDPOINT,
        {},
        { fetch: respond(200, { folio: 'PYP-2026-000123', duplicate: true }) },
      ),
    ).toEqual({ kind: 'saved', folio: 'PYP-2026-000123' });
  });

  it('returns the rejected variants of a 409', async () => {
    const fetch = respond(409, { error: 'invalid_items', fields: { items: [VARIANT] } });
    expect(await postQuote(ENDPOINT, {}, { fetch })).toEqual({
      kind: 'invalid_items',
      variantIds: [VARIANT],
    });
  });

  it('turns every other answer into a failure', async () => {
    const cases: [number, unknown, string][] = [
      [403, { error: 'turnstile_failed' }, 'turnstile'],
      [429, { error: 'rate_limited' }, 'rate_limited'],
      [500, { error: 'internal_error' }, 'server'],
      [400, { error: 'validation_error' }, 'server'],
      [502, 'Bad gateway', 'server'],
    ];
    for (const [status, body, reason] of cases) {
      expect(await postQuote(ENDPOINT, {}, { fetch: respond(status, body) })).toEqual({
        kind: 'failed',
        reason,
      });
    }
    const down = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    expect(await postQuote(ENDPOINT, {}, { fetch: down })).toEqual({
      kind: 'failed',
      reason: 'network',
    });
  });

  it('gives up after the time limit', async () => {
    const slow = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError'))),
        ),
    ) as unknown as typeof fetch;
    expect(await postQuote(ENDPOINT, {}, { fetch: slow, timeoutMs: 20 })).toEqual({
      kind: 'failed',
      reason: 'timeout',
    });
  });

  it('posts JSON to the endpoint', async () => {
    const fetch = respond(201, { folio: 'PYP-2026-000001' });
    await postQuote(ENDPOINT, { a: 1 }, { fetch });
    expect(fetch).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        body: '{"a":1}',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});

describe('sendQuote', () => {
  const base = {
    lines,
    requester,
    catalog: null,
    whatsappNumber: '5500000000',
    clientRequestId: 'id-1',
    endpoint: ENDPOINT,
    takeToken: async () => 'token-1',
  };
  const text = (url: string | null) => decodeURIComponent(new URL(url!).searchParams.get('text')!);

  it('sends the list and opens WhatsApp with the folio', async () => {
    const post = vi.fn(async () => ({ kind: 'saved' as const, folio: 'PYP-2026-000123' }));
    const { result, waUrl } = await sendQuote({ ...base, post });
    expect(result).toEqual({ kind: 'saved', folio: 'PYP-2026-000123' });
    expect(text(waUrl)).toContain('Folio *PYP-2026-000123*');
    expect(post).toHaveBeenCalledWith(ENDPOINT, {
      ...submissionBody(requester, [], 'id-1', 'token-1'),
      items: [{ variantId: VARIANT, quantity: 12, personalize: true, notes: 'Escudo' }],
    });
  });

  it('opens WhatsApp without folio when saving fails', async () => {
    const post = vi.fn(async () => ({ kind: 'failed' as const, reason: 'timeout' as const }));
    const { waUrl } = await sendQuote({ ...base, post });
    expect(text(waUrl).startsWith('¡Hola! Quiero cotizar.\n')).toBe(true);
    expect(text(waUrl)).toContain('Balón #5 (BAL-005) — 12 pzs');
  });

  it('does not call the function without a Turnstile token or without endpoint', async () => {
    const post = vi.fn();
    const noToken = await sendQuote({
      ...base,
      post,
      takeToken: () => Promise.reject(new Error('x')),
    });
    expect(noToken.result).toEqual({ kind: 'failed', reason: 'turnstile' });
    expect(noToken.waUrl).toMatch(/^https:\/\/wa\.me\/525500000000\?text=/);
    const noEndpoint = await sendQuote({ ...base, post, endpoint: null });
    expect(noEndpoint.result).toEqual({ kind: 'failed', reason: 'not_configured' });
    expect(post).not.toHaveBeenCalled();
  });

  it('gives no WhatsApp link for a 409: the list has to change first', async () => {
    const post = vi.fn(async () => ({ kind: 'invalid_items' as const, variantIds: [VARIANT] }));
    expect(await sendQuote({ ...base, post })).toEqual({
      result: { kind: 'invalid_items', variantIds: [VARIANT] },
      waUrl: null,
    });
  });
});
