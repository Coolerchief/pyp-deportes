import { assertEquals, assertMatch } from '@std/assert';
import { type Caller, createSignUploadHandler, type SignUploadDeps } from './handler.ts';

const ORIGIN = 'http://localhost:3000';
const PRODUCT = '0b6f0b6f-0000-4000-8000-000000000001';
const IMAGE = '0b6f0b6f-0000-4000-8000-0000000000aa';

function setup(caller: Caller = 'staff', overrides: Partial<SignUploadDeps> = {}) {
  const signed: { key: string; headers: Record<string, string>; expiresIn: number }[] = [];
  const handle = createSignUploadHandler({
    allowedOrigins: [ORIGIN],
    whoIs: () => Promise.resolve(caller),
    presignPut: (key, headers, expiresIn) => {
      signed.push({ key, headers, expiresIn });
      return Promise.resolve(`https://r2.test/${key}?firma`);
    },
    ...overrides,
  });
  return { handle, signed };
}

function post(body: unknown, init: { token?: string | null; origin?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (init.token !== null) headers.Authorization = `Bearer ${init.token ?? 'jwt-de-prueba'}`;
  headers.Origin = init.origin ?? ORIGIN;
  return new Request('https://fn.test/sign-upload', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const valid = {
  scope: 'product',
  ownerId: PRODUCT,
  imageId: IMAGE,
  widths: [320, 640, 1024, 1600],
  contentType: 'image/webp',
};

Deno.test('staff get one signed PUT per width, with immutable cache', async () => {
  const { handle, signed } = setup();
  const response = await handle(post(valid));
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('access-control-allow-origin'), ORIGIN);
  const body = await response.json();
  assertEquals(body.keyBase, `p/${PRODUCT}/${IMAGE}`);
  assertEquals(
    body.uploads.map((u: { key: string }) => u.key),
    [320, 640, 1024, 1600].map((w) => `p/${PRODUCT}/${IMAGE}-${w}.webp`),
  );
  assertEquals(body.headers, {
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  assertEquals(body.expiresIn, 600);
  assertEquals(signed[0]?.expiresIn, 600);
  assertMatch(body.uploads[0].url, /^https:\/\/r2\.test\//);
});

Deno.test('site photos go under s/{slot} with their own widths', async () => {
  const { handle } = setup();
  const response = await handle(
    post({ ...valid, scope: 'site', ownerId: 'home_hero', widths: [640, 2400] }),
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.uploads[1].key, `s/home_hero/${IMAGE}-2400.webp`);
});

Deno.test('without a session it is 401, and 403 for someone who is not staff', async () => {
  assertEquals((await setup().handle(post(valid, { token: null }))).status, 401);
  assertEquals((await setup('unauthenticated').handle(post(valid))).status, 401);
  const forbidden = await setup('not_staff').handle(post(valid));
  assertEquals(forbidden.status, 403);
  assertEquals(await forbidden.json(), { error: 'forbidden' });
});

Deno.test('the request is validated field by field', async () => {
  const { handle, signed } = setup();
  const response = await handle(post({ ...valid, imageId: 'y', contentType: 'image/png' }));
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error, 'invalid_request');
  assertEquals(Object.keys(body.fields).sort(), ['contentType', 'imageId']);
  // The rules that depend on the scope run once the shape is right.
  const rules = await (await handle(post({ ...valid, ownerId: 'x', widths: [320, 333] }))).json();
  assertEquals(Object.keys(rules.fields).sort(), ['ownerId', 'widths']);
  const slot = await handle(post({ ...valid, scope: 'site', ownerId: 'portada', widths: [640] }));
  assertEquals((await slot.json()).fields.ownerId, 'Espacio de foto desconocido.');
  assertEquals(signed.length, 0);
});

Deno.test('CORS: preflight, other sites and other methods', async () => {
  const { handle } = setup();
  const preflight = await handle(
    new Request('https://fn.test/sign-upload', { method: 'OPTIONS', headers: { Origin: ORIGIN } }),
  );
  assertEquals(preflight.status, 204);
  assertMatch(preflight.headers.get('access-control-allow-headers') ?? '', /authorization/);
  assertEquals((await handle(post(valid, { origin: 'https://otro.test' }))).status, 403);
  const get = await handle(
    new Request('https://fn.test/sign-upload', { headers: { Origin: ORIGIN } }),
  );
  assertEquals(get.status, 405);
});

Deno.test('a failure checking the session or signing is a 500 without details', async () => {
  const logged: string[] = [];
  const broken = setup('staff', {
    whoIs: () => Promise.reject(new Error('red')),
    logError: (where) => logged.push(where),
  });
  assertEquals((await broken.handle(post(valid))).status, 500);
  const signer = setup('staff', {
    presignPut: () => Promise.reject(new Error('firma')),
    logError: (where) => logged.push(where),
  });
  const response = await signer.handle(post(valid));
  assertEquals(response.status, 500);
  assertEquals(await response.json(), { error: 'internal_error' });
  assertEquals(logged, ['whoIs', 'presign']);
});
