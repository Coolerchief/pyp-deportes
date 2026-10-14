import { assertEquals, assertRejects } from '@std/assert';
import { clientIp, hashIp, parseAllowedOrigins } from '../_shared/http.ts';
import { PostgrestError } from '../_shared/postgrest.ts';
import { SITEVERIFY_URL } from '../_shared/turnstile.ts';
import { createSubmitQuoteDeps, invalidItemsOf, missingEnv } from './deps.ts';

const env = {
  SUPABASE_URL: 'https://pyp-dev.supabase.co/',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-de-prueba',
  TURNSTILE_SECRET_KEY: 'secreto-de-prueba',
  IP_HASH_SALT: 'sal',
};

type Seen = { url: string; method: string; headers: Headers; body: BodyInit | null | undefined };

function fakeFetch(answer: (seen: Seen) => Response) {
  const seen: Seen[] = [];
  const doFetch = ((input: string | URL | Request, init?: RequestInit) => {
    const call = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: init?.body,
    };
    seen.push(call);
    return Promise.resolve(answer(call));
  }) as typeof fetch;
  return { doFetch, seen };
}

Deno.test('missingEnv names the missing secrets', () => {
  assertEquals(missingEnv(env), []);
  assertEquals(missingEnv({ ...env, IP_HASH_SALT: ' ', TURNSTILE_SECRET_KEY: undefined }), [
    'TURNSTILE_SECRET_KEY',
    'IP_HASH_SALT',
  ]);
});

Deno.test('allowed origins: list from the env or the defaults', () => {
  assertEquals(parseAllowedOrigins(' https://a.workers.dev/ , http://localhost:3000'), [
    'https://a.workers.dev',
    'http://localhost:3000',
  ]);
  assertEquals(parseAllowedOrigins(''), [
    'https://pypdeportescoapa.com',
    'https://www.pypdeportescoapa.com',
    'http://localhost:3000',
  ]);
});

Deno.test('IP: first forwarded address, hashed with the salt', async () => {
  const request = new Request('https://x', {
    headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
  });
  assertEquals(clientIp(request), '203.0.113.7');
  assertEquals(clientIp(new Request('https://x')), null);
  // sha256("203.0.113.7sal")
  const hash = await hashIp('203.0.113.7', 'sal');
  assertEquals(hash.length, 64);
  assertEquals(hash, await hashIp('203.0.113.7', 'sal'));
  assertEquals(hash === (await hashIp('203.0.113.7', 'otra')), false);
});

Deno.test('Turnstile: posts secret, token and IP to Siteverify', async () => {
  const { doFetch, seen } = fakeFetch(() => Response.json({ success: true }));
  const deps = createSubmitQuoteDeps(env, doFetch);
  assertEquals(await deps.verifyTurnstile('token', '203.0.113.7'), true);
  assertEquals(seen[0]!.url, SITEVERIFY_URL);
  const form = seen[0]!.body as FormData;
  assertEquals(form.get('secret'), 'secreto-de-prueba');
  assertEquals(form.get('response'), 'token');
  assertEquals(form.get('remoteip'), '203.0.113.7');

  const rejected = createSubmitQuoteDeps(
    env,
    fakeFetch(() => Response.json({ success: false, 'error-codes': ['timeout-or-duplicate'] }))
      .doFetch,
  );
  assertEquals(await rejected.verifyTurnstile('token', null), false);

  const down = createSubmitQuoteDeps(
    env,
    fakeFetch(() => new Response('', { status: 503 })).doFetch,
  );
  await assertRejects(() => down.verifyTurnstile('token', null));
});

Deno.test('rate limit: read from settings, defaults when missing or broken', async () => {
  const { doFetch, seen } = fakeFetch(() =>
    Response.json([{ value: { per_ip_hour: 3, per_phone_hour: 8 } }]),
  );
  assertEquals(await createSubmitQuoteDeps(env, doFetch).rateLimit(), {
    perIpHour: 3,
    perPhoneHour: 8,
  });
  assertEquals(
    seen[0]!.url,
    'https://pyp-dev.supabase.co/rest/v1/settings?key=eq.quote_rate_limit&select=value',
  );
  assertEquals(seen[0]!.headers.get('authorization'), 'Bearer service-role-de-prueba');

  const empty = createSubmitQuoteDeps(env, fakeFetch(() => Response.json([])).doFetch);
  assertEquals(await empty.rateLimit(), { perIpHour: 5, perPhoneHour: 5 });
  const broken = createSubmitQuoteDeps(
    env,
    fakeFetch(() => Response.json([{ value: { per_ip_hour: 'x', per_phone_hour: 0 } }])).doFetch,
  );
  assertEquals(await broken.rateLimit(), { perIpHour: 5, perPhoneHour: 5 });
});

Deno.test('countRecent: exact count of the last hour, leaving out the retry itself', async () => {
  const { doFetch, seen } = fakeFetch(
    () => new Response(null, { status: 206, headers: { 'content-range': '0-0/4' } }),
  );
  const deps = createSubmitQuoteDeps(env, doFetch);
  const since = new Date('2026-10-14T17:00:00.000Z');
  const excludeRequestId = '0b6f2c1e-8d3a-4f5b-9c7e-1a2b3c4d5e6f';
  assertEquals(await deps.countRecent({ phone: '5512345678', since, excludeRequestId }), 4);
  assertEquals(
    seen[0]!.url,
    'https://pyp-dev.supabase.co/rest/v1/quote_requests?select=id&customer_phone=eq.5512345678' +
      '&created_at=gte.2026-10-14T17%3A00%3A00.000Z' +
      `&client_request_id=neq.${excludeRequestId}`,
  );
  assertEquals(seen[0]!.method, 'HEAD');
  assertEquals(seen[0]!.headers.get('prefer'), 'count=exact');

  await deps.countRecent({ ipHash: 'abc123', since, excludeRequestId });
  assertEquals(seen[1]!.url.includes('ip_hash=eq.abc123'), true);

  const none = createSubmitQuoteDeps(
    env,
    fakeFetch(() => new Response(null, { headers: { 'content-range': '*/0' } })).doFetch,
  );
  assertEquals(await none.countRecent({ phone: '5512345678', since, excludeRequestId }), 0);
});

Deno.test('createQuoteRequest: folio, duplicate and invalid_items', async () => {
  const payloads: unknown[] = [];
  const created = createSubmitQuoteDeps(
    env,
    fakeFetch((seen) => {
      payloads.push(JSON.parse(String(seen.body)));
      return Response.json({ folio: 'PYP-2026-000123', id: 'x', duplicate: false });
    }).doFetch,
  );
  const payload = { clientRequestId: 'id' } as never;
  assertEquals(await created.createQuoteRequest(payload), {
    kind: 'created',
    folio: 'PYP-2026-000123',
    duplicate: false,
  });
  assertEquals(payloads, [{ payload: { clientRequestId: 'id' } }]);

  const invalid = createSubmitQuoteDeps(
    env,
    fakeFetch(() =>
      Response.json(
        { code: '23514', message: 'invalid_items', details: '{"items": ["v1", "v2"]}', hint: null },
        { status: 400 },
      ),
    ).doFetch,
  );
  assertEquals(await invalid.createQuoteRequest(payload), {
    kind: 'invalid_items',
    items: ['v1', 'v2'],
  });

  const failing = createSubmitQuoteDeps(
    env,
    fakeFetch(() => Response.json({ code: '42501', message: 'permission denied' }, { status: 403 }))
      .doFetch,
  );
  await assertRejects(() => failing.createQuoteRequest(payload), PostgrestError);
});

Deno.test('invalidItemsOf only recognizes the invalid_items check_violation', () => {
  assertEquals(invalidItemsOf(new Error('x')), null);
  assertEquals(invalidItemsOf(new PostgrestError(400, '23514', 'otra', null)), null);
  assertEquals(invalidItemsOf(new PostgrestError(400, '23514', 'invalid_items', 'no json')), []);
});
