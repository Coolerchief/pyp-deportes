import { assertEquals, assertMatch } from '@std/assert';
import { createSignUploadDeps, missingEnv, r2ObjectUrl } from './deps.ts';

const ENV = {
  SUPABASE_URL: 'https://pyp-dev.supabase.co/',
  SUPABASE_ANON_KEY: 'anon',
  R2_ACCOUNT_ID: 'cuenta',
  R2_ACCESS_KEY_ID: 'AKID',
  R2_SECRET_ACCESS_KEY: 'SECRETO',
  R2_BUCKET: 'pyp-media',
};

Deno.test('missingEnv names what is missing, never values', () => {
  assertEquals(missingEnv({ ...ENV, R2_BUCKET: ' ', R2_SECRET_ACCESS_KEY: undefined }), [
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
  ]);
  assertEquals(missingEnv(ENV), []);
});

Deno.test('whoIs asks is_staff() with the caller token', async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const answers = [
    new Response('true'),
    new Response('false'),
    new Response('{}', { status: 401 }),
  ];
  const deps = createSignUploadDeps(ENV, (url, init) => {
    calls.push({ url: String(url), init: init! });
    return Promise.resolve(answers.shift()!);
  });
  assertEquals(await deps.whoIs('jwt'), 'staff');
  assertEquals(await deps.whoIs('jwt'), 'not_staff');
  assertEquals(await deps.whoIs('jwt'), 'unauthenticated');
  assertEquals(calls[0]?.url, 'https://pyp-dev.supabase.co/rest/v1/rpc/is_staff');
  const headers = calls[0]?.init.headers as Record<string, string>;
  assertEquals(headers.Authorization, 'Bearer jwt');
  assertEquals(headers.apikey, 'anon');
});

Deno.test('presignPut signs a PUT to the R2 bucket', async () => {
  const deps = createSignUploadDeps(ENV, fetch, () => new Date('2026-10-14T12:00:00Z'));
  const url = await deps.presignPut('p/1/a-320.webp', { 'Content-Type': 'image/webp' }, 600);
  assertMatch(url, /^https:\/\/cuenta\.r2\.cloudflarestorage\.com\/pyp-media\/p\/1\/a-320\.webp\?/);
  assertMatch(url, /X-Amz-Expires=600/);
  assertMatch(url, /X-Amz-SignedHeaders=content-type%3Bhost/);
  assertEquals(r2ObjectUrl('c', 'b', 'k'), 'https://c.r2.cloudflarestorage.com/b/k');
});
