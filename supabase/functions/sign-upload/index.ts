// POST /functions/v1/sign-upload (Schema §9.2). Staff only: the function checks the caller's
// session itself (config.toml turns off the gateway check so the CORS preflight gets through).

import { corsHeaders, json, parseAllowedOrigins } from '../_shared/http.ts';
import { createSignUploadDeps, missingEnv, type SignUploadEnv } from './deps.ts';
import { createSignUploadHandler } from './handler.ts';

const env = Deno.env.toObject() as SignUploadEnv;
const missing = missingEnv(env);

if (missing.length > 0) {
  console.error('sign-upload: faltan secretos', missing.join(', '));
}

const handle =
  missing.length > 0
    ? // Without R2 there is nowhere to upload: the panel says photos are not set up yet. CORS
      // still answers, so the browser can read that reason.
      (request: Request) => {
        const cors = corsHeaders(
          request.headers.get('origin'),
          parseAllowedOrigins(env.ALLOWED_ORIGINS),
        );
        return Promise.resolve(
          request.method === 'OPTIONS'
            ? new Response(null, { status: 204, headers: cors })
            : json(503, { error: 'not_configured' }, cors),
        );
      }
    : createSignUploadHandler(
        createSignUploadDeps(env as Parameters<typeof createSignUploadDeps>[0]),
      );

Deno.serve(handle);
