// POST /functions/v1/submit-quote (Schema §9.1). Public: deployed without JWT check
// (config.toml), protected by Turnstile, CORS and the rate limit.

import { json } from '../_shared/http.ts';
import { createSubmitQuoteHandler } from './handler.ts';
import { createSubmitQuoteDeps, missingEnv, type SubmitQuoteEnv } from './deps.ts';

const env = Deno.env.toObject() as SubmitQuoteEnv;
const missing = missingEnv(env);

if (missing.length > 0) {
  console.error('submit-quote: faltan secretos', missing.join(', '));
}

const handle =
  missing.length > 0
    ? // Fail closed: without Turnstile or the salt nothing is saved; the site falls back to
      // WhatsApp without folio (rule 5).
      () => Promise.resolve(json(500, { error: 'internal_error' }))
    : createSubmitQuoteHandler(
        createSubmitQuoteDeps(env as Parameters<typeof createSubmitQuoteDeps>[0]),
      );

Deno.serve(handle);
