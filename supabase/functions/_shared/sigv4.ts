// AWS Signature Version 4 query-string signing (presigned URLs), as R2's S3 API accepts it
// (TRD §6.2). WebCrypto only: no AWS SDK to load in the Edge Function.

const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function hmac(
  key: ArrayBuffer | Uint8Array<ArrayBuffer>,
  value: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value));
}

/** RFC 3986 encoding, as SigV4 wants it (encodeURIComponent leaves !'()* alone). */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** 2013-05-24T00:00:00.000Z → { amzDate: '20130524T000000Z', date: '20130524' }. */
export function amzDates(at: Date): { amzDate: string; date: string } {
  const amzDate = at
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return { amzDate, date: amzDate.slice(0, 8) };
}

export type PresignInput = {
  method: 'GET' | 'PUT';
  /** e.g. https://<account>.r2.cloudflarestorage.com/<bucket>/p/<id>/<image>-320.webp */
  url: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service?: string;
  at: Date;
  expiresIn: number;
  /** Headers the client must send exactly (besides host), e.g. content-type and cache-control. */
  headers?: Record<string, string>;
};

/** A URL that allows `method` on `url` until `expiresIn` seconds after `at`. */
export async function presignUrl(input: PresignInput): Promise<string> {
  const service = input.service ?? 's3';
  const target = new URL(input.url);
  const { amzDate, date } = amzDates(input.at);
  const scope = `${date}/${input.region}/${service}/aws4_request`;

  const headers: Record<string, string> = { host: target.host };
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    headers[name.toLowerCase()] = value.trim().replace(/\s+/g, ' ');
  }
  const headerNames = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(';');

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${input.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(input.expiresIn),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((key) => `${uriEncode(key)}=${uriEncode(query[key]!)}`)
    .join('&');
  // Each path segment is encoded once; the slashes stay.
  const canonicalUri = target.pathname
    .split('/')
    .map((segment) => uriEncode(decodeURIComponent(segment)))
    .join('/');

  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQuery,
    headerNames.map((name) => `${name}:${headers[name]}\n`).join(''),
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256Hex(canonicalRequest)].join(
    '\n',
  );

  let key: ArrayBuffer = await hmac(encoder.encode(`AWS4${input.secretAccessKey}`), date);
  for (const part of [input.region, service, 'aws4_request']) key = await hmac(key, part);
  const signature = hex(await hmac(key, stringToSign));

  return `${target.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
