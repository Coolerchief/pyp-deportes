import { assertEquals, assertExists } from '@std/assert';
import {
  type CreateQuotePayload,
  type CreateQuoteResult,
  createSubmitQuoteHandler,
  type RecentFilter,
  type SubmitQuoteDeps,
} from './handler.ts';

const ORIGIN = 'http://localhost:3000';
const NOW = new Date('2026-10-14T18:00:00.000Z');
const REQUEST_ID = '0b6f2c1e-8d3a-4f5b-9c7e-1a2b3c4d5e6f';
const VARIANT = '5d9b8e2a-7c1f-4a3e-8b6d-2f4e6a8c0b1d';

const validBody = () => ({
  clientRequestId: REQUEST_ID,
  turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
  customer: { name: '  Juan Pérez ', phone: '55 1234 5678', type: 'league_team', organization: '' },
  neededBy: '2026-10-21',
  deliveryMethod: 'pickup',
  requiresInvoice: true,
  note: 'Colores verde y blanco.',
  privacyAccepted: true,
  privacyVersion: '2026-10',
  items: [{ variantId: VARIANT, quantity: 4, personalize: true, notes: ' Escudo al pecho ' }],
});

type Calls = {
  turnstile: { token: string; ip: string | null }[];
  counts: RecentFilter[];
  created: CreateQuotePayload[];
  errors: unknown[];
};

function setup(overrides: Partial<SubmitQuoteDeps> = {}, counts = { ip: 0, phone: 0 }) {
  const calls: Calls = { turnstile: [], counts: [], created: [], errors: [] };
  const deps: SubmitQuoteDeps = {
    allowedOrigins: [ORIGIN],
    verifyTurnstile: (token, ip) => {
      calls.turnstile.push({ token, ip });
      return Promise.resolve(true);
    },
    hashIp: (ip) => Promise.resolve(`hash(${ip})`),
    rateLimit: () => Promise.resolve({ perIpHour: 5, perPhoneHour: 5 }),
    countRecent: (filter) => {
      calls.counts.push(filter);
      return Promise.resolve('ipHash' in filter ? counts.ip : counts.phone);
    },
    createQuoteRequest: (payload) => {
      calls.created.push(payload);
      return Promise.resolve<CreateQuoteResult>({
        kind: 'created',
        folio: 'PYP-2026-000123',
        duplicate: false,
      });
    },
    now: () => NOW,
    logError: (_where, error) => calls.errors.push(error),
    ...overrides,
  };
  return { handle: createSubmitQuoteHandler(deps), calls };
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://pyp-dev.supabase.co/functions/v1/submit-quote', {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      'user-agent': 'Prueba/1.0',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

Deno.test('201: creates the request and answers with its folio', async () => {
  const { handle, calls } = setup();
  const response = await handle(post(validBody()));
  assertEquals(response.status, 201);
  assertEquals(await response.json(), { folio: 'PYP-2026-000123' });
  assertEquals(response.headers.get('access-control-allow-origin'), ORIGIN);
  assertEquals(calls.turnstile, [{ token: 'XXXX.DUMMY.TOKEN.XXXX', ip: '203.0.113.7' }]);
  // The database gets the validated data: trimmed, phone as 10 digits, no token.
  assertEquals(calls.created, [
    {
      clientRequestId: REQUEST_ID,
      customer: {
        name: 'Juan Pérez',
        phone: '5512345678',
        type: 'league_team',
        organization: undefined,
      },
      neededBy: '2026-10-21',
      deliveryMethod: 'pickup',
      requiresInvoice: true,
      note: 'Colores verde y blanco.',
      privacyVersion: '2026-10',
      items: [{ variantId: VARIANT, quantity: 4, personalize: true, notes: 'Escudo al pecho' }],
      meta: { ipHash: 'hash(203.0.113.7)', userAgent: 'Prueba/1.0' },
    },
  ]);
});

Deno.test('200: a retry with the same clientRequestId gets the same folio', async () => {
  const { handle } = setup({
    createQuoteRequest: () =>
      Promise.resolve({ kind: 'created', folio: 'PYP-2026-000123', duplicate: true }),
  });
  const response = await handle(post(validBody()));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { folio: 'PYP-2026-000123', duplicate: true });
});

Deno.test('400: invalid data lists the fields, before counting or saving', async () => {
  const { handle, calls } = setup();
  const body = { ...validBody(), privacyAccepted: false, neededBy: '2026-10-13' };
  body.customer.phone = '55123';
  body.items[0]!.quantity = 0;
  const response = await handle(post(body));
  assertEquals(response.status, 400);
  const json = await response.json();
  assertEquals(json.error, 'validation_error');
  assertEquals(json.fields['customer.phone'], 'Faltan dígitos: deben ser 10.');
  assertEquals(json.fields.neededBy, 'Elige una fecha de hoy en adelante.');
  assertEquals(json.fields.privacyAccepted, 'Acepta el aviso de privacidad para enviar.');
  assertEquals(json.fields['items.0.quantity'], 'Indica al menos 1 pieza.');
  assertEquals(calls.counts.length, 0);
  assertEquals(calls.created.length, 0);
});

Deno.test('400: a body that is not JSON', async () => {
  const { handle, calls } = setup();
  const response = await handle(post('{"items": ['));
  assertEquals(response.status, 400);
  assertEquals(await response.json(), {
    error: 'validation_error',
    fields: { body: 'JSON inválido.' },
  });
  assertEquals(calls.turnstile.length, 0);
});

Deno.test('400: no products', async () => {
  const { handle } = setup();
  const response = await handle(post({ ...validBody(), items: [] }));
  assertEquals(response.status, 400);
  assertEquals((await response.json()).fields.items, 'Tu lista está vacía.');
});

Deno.test('403: Turnstile rejects the token, nothing else runs', async () => {
  const { handle, calls } = setup({ verifyTurnstile: () => Promise.resolve(false) });
  const response = await handle(post({ ...validBody(), customer: {} }));
  assertEquals(response.status, 403);
  assertEquals(await response.json(), { error: 'turnstile_failed' });
  assertEquals(calls.counts.length, 0);
  assertEquals(calls.created.length, 0);
});

Deno.test('403: without a token Siteverify is not even called', async () => {
  const { handle, calls } = setup();
  const response = await handle(post({ ...validBody(), turnstileToken: '' }));
  assertEquals(response.status, 403);
  assertEquals(calls.turnstile.length, 0);
});

Deno.test('409: a product is no longer available, with its variantId', async () => {
  const { handle } = setup({
    createQuoteRequest: () => Promise.resolve({ kind: 'invalid_items', items: [VARIANT] }),
  });
  const response = await handle(post(validBody()));
  assertEquals(response.status, 409);
  assertEquals(await response.json(), { error: 'invalid_items', fields: { items: [VARIANT] } });
});

Deno.test('429: five requests in the last hour from the same IP', async () => {
  const { handle, calls } = setup({}, { ip: 5, phone: 0 });
  const response = await handle(post(validBody()));
  assertEquals(response.status, 429);
  assertEquals(await response.json(), { error: 'rate_limited' });
  assertEquals(calls.created.length, 0);
  const since = new Date('2026-10-14T17:00:00.000Z');
  assertEquals(calls.counts, [
    { ipHash: 'hash(203.0.113.7)', since, excludeRequestId: REQUEST_ID },
    { phone: '5512345678', since, excludeRequestId: REQUEST_ID },
  ]);
});

Deno.test('429: five requests in the last hour from the same phone', async () => {
  const { handle } = setup({}, { ip: 0, phone: 5 });
  assertEquals((await handle(post(validBody()))).status, 429);
});

Deno.test('the limit comes from settings: 4 of 5 still passes, 2 of 2 does not', async () => {
  assertEquals((await setup({}, { ip: 4, phone: 4 }).handle(post(validBody()))).status, 201);
  const strict = setup(
    { rateLimit: () => Promise.resolve({ perIpHour: 2, perPhoneHour: 5 }) },
    {
      ip: 2,
      phone: 0,
    },
  );
  assertEquals((await strict.handle(post(validBody()))).status, 429);
});

Deno.test('without an IP only the phone is counted and no hash is saved', async () => {
  const { handle, calls } = setup();
  const request = new Request('https://pyp-dev.supabase.co/functions/v1/submit-quote', {
    method: 'POST',
    headers: { origin: ORIGIN },
    body: JSON.stringify(validBody()),
  });
  assertEquals((await handle(request)).status, 201);
  assertEquals(calls.counts.length, 1);
  assertEquals(calls.created[0]!.meta, { ipHash: null, userAgent: null });
});

Deno.test('500: a database failure is logged and answered as internal_error', async () => {
  const failure = new Error('connection refused');
  const { handle, calls } = setup({ createQuoteRequest: () => Promise.reject(failure) });
  const response = await handle(post(validBody()));
  assertEquals(response.status, 500);
  assertEquals(await response.json(), { error: 'internal_error' });
  assertEquals(response.headers.get('access-control-allow-origin'), ORIGIN);
  assertEquals(calls.errors, [failure]);
});

Deno.test('500: Siteverify cannot be reached', async () => {
  const { handle } = setup({ verifyTurnstile: () => Promise.reject(new Error('timeout')) });
  assertEquals((await handle(post(validBody()))).status, 500);
});

Deno.test('CORS: preflight from an allowed origin', async () => {
  const { handle } = setup();
  const response = await handle(
    new Request('https://x/functions/v1/submit-quote', {
      method: 'OPTIONS',
      headers: { origin: ORIGIN, 'access-control-request-method': 'POST' },
    }),
  );
  assertEquals(response.status, 204);
  assertEquals(response.headers.get('access-control-allow-origin'), ORIGIN);
  assertExists(response.headers.get('access-control-allow-headers'));
});

Deno.test('CORS: another site is refused without CORS headers', async () => {
  const { handle, calls } = setup();
  const response = await handle(post(validBody(), { origin: 'https://otro-sitio.example' }));
  assertEquals(response.status, 403);
  assertEquals(await response.json(), { error: 'forbidden_origin' });
  assertEquals(response.headers.get('access-control-allow-origin'), null);
  assertEquals(calls.turnstile.length, 0);
});

Deno.test('405: only POST', async () => {
  const { handle } = setup();
  const response = await handle(
    new Request('https://x/functions/v1/submit-quote', { headers: { origin: ORIGIN } }),
  );
  assertEquals(response.status, 405);
});
