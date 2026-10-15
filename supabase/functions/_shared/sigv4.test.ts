import { assertEquals, assertMatch } from '@std/assert';
import { amzDates, presignUrl, uriEncode } from './sigv4.ts';

// AWS's published example of a presigned URL ("Authenticating Requests: Using Query Parameters",
// GET examplebucket/test.txt): the signature must match theirs byte for byte.
Deno.test('presignUrl reproduces the AWS documentation example', async () => {
  const url = await presignUrl({
    method: 'GET',
    url: 'https://examplebucket.s3.amazonaws.com/test.txt',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
    at: new Date('2013-05-24T00:00:00Z'),
    expiresIn: 86400,
  });
  assertEquals(
    url,
    'https://examplebucket.s3.amazonaws.com/test.txt' +
      '?X-Amz-Algorithm=AWS4-HMAC-SHA256' +
      '&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request' +
      '&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host' +
      '&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
  );
});

Deno.test('presignUrl signs the headers the client must send', async () => {
  const url = await presignUrl({
    method: 'PUT',
    url: 'https://acct.r2.cloudflarestorage.com/media/p/1/a-320.webp',
    accessKeyId: 'AKID',
    secretAccessKey: 'SECRET',
    region: 'auto',
    at: new Date('2026-10-14T12:00:00Z'),
    expiresIn: 600,
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public,  max-age=31536000' },
  });
  assertMatch(url, /X-Amz-SignedHeaders=cache-control%3Bcontent-type%3Bhost/);
  assertMatch(url, /X-Amz-Credential=AKID%2F20261014%2Fauto%2Fs3%2Faws4_request/);
  assertMatch(url, /X-Amz-Signature=[0-9a-f]{64}$/);
  assertMatch(url, /^https:\/\/acct\.r2\.cloudflarestorage\.com\/media\/p\/1\/a-320\.webp\?/);
});

Deno.test('helpers', () => {
  assertEquals(uriEncode("a b/(c)!*'"), 'a%20b%2F%28c%29%21%2A%27');
  assertEquals(amzDates(new Date('2026-01-02T03:04:05.678Z')), {
    amzDate: '20260102T030405Z',
    date: '20260102',
  });
});
