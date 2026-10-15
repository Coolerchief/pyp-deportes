// sign-upload (Schema §9.2): CORS → staff session → validation → one signed PUT URL per width.
// The browser uploads the WebP files straight to R2; this function never sees the photo. The
// outside world (who the caller is, the signer, the clock) comes in as dependencies so every
// response is tested without network (handler.test.ts).

import {
  MEDIA_CACHE_CONTROL,
  mediaFileKey,
  mediaKeyBase,
  SIGNED_UPLOAD_SECONDS,
  type SignUploadResponse,
  SignUploadRequestSchema,
} from '../../../packages/shared/src/index.ts';
import { corsHeaders, json } from '../_shared/http.ts';

export type Caller = 'staff' | 'not_staff' | 'unauthenticated';

export type SignUploadDeps = {
  allowedOrigins: readonly string[];
  /** Who owns the bearer token: checked with is_staff() through PostgREST (RLS decides). */
  whoIs(token: string): Promise<Caller>;
  /** A presigned PUT URL for an R2 key, valid for `expiresIn` seconds. */
  presignPut(key: string, headers: Record<string, string>, expiresIn: number): Promise<string>;
  logError?: (where: string, error: unknown) => void;
};

function fieldsOf(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'body';
    fields[key] ??= issue.message;
  }
  return fields;
}

export function createSignUploadHandler(deps: SignUploadDeps) {
  const logError = deps.logError ?? (() => {});

  return async function handle(request: Request): Promise<Response> {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin, deps.allowedOrigins);
    const reply = (status: number, body: unknown) => json(status, body, cors);

    if (origin && !deps.allowedOrigins.includes(origin)) {
      return json(403, { error: 'forbidden_origin' });
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

    const token = request.headers
      .get('authorization')
      ?.match(/^Bearer\s+(.+)$/i)?.[1]
      ?.trim();
    if (!token) return reply(401, { error: 'unauthenticated' });

    let caller: Caller;
    try {
      caller = await deps.whoIs(token);
    } catch (error) {
      logError('whoIs', error);
      return reply(500, { error: 'internal_error' });
    }
    if (caller === 'unauthenticated') return reply(401, { error: 'unauthenticated' });
    if (caller === 'not_staff') return reply(403, { error: 'forbidden' });

    const body = await request.json().catch(() => null);
    const parsed = SignUploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      return reply(400, { error: 'invalid_request', fields: fieldsOf(parsed.error.issues) });
    }

    const { scope, ownerId, imageId, widths, contentType } = parsed.data;
    const keyBase = mediaKeyBase(scope, ownerId, imageId);
    const headers = { 'Content-Type': contentType, 'Cache-Control': MEDIA_CACHE_CONTROL };
    try {
      const uploads = await Promise.all(
        widths.map(async (width) => {
          const key = mediaFileKey(keyBase, width);
          return { width, key, url: await deps.presignPut(key, headers, SIGNED_UPLOAD_SECONDS) };
        }),
      );
      const response: SignUploadResponse = {
        keyBase,
        uploads,
        headers,
        expiresIn: SIGNED_UPLOAD_SECONDS,
      };
      return reply(200, response);
    } catch (error) {
      logError('presign', error);
      return reply(500, { error: 'internal_error' });
    }
  };
}
