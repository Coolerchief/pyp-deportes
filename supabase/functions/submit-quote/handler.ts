// submit-quote (Schema §9.1): CORS → Turnstile → validation → rate limit → create_quote_request.
// The handler gets its outside world (Turnstile, database, clock) as dependencies so every
// response code is tested without network (handler.test.ts); index.ts wires the real ones.

import {
  createQuoteSubmissionSchema,
  type QuoteSubmission,
} from '../../../packages/shared/src/index.ts';
import { clientIp, corsHeaders, json } from '../_shared/http.ts';

export type RateLimit = { perIpHour: number; perPhoneHour: number };

/** Requests created in the last hour by an IP hash or a phone, leaving out a retry's own one. */
export type RecentFilter = { since: Date; excludeRequestId: string } & (
  { ipHash: string } | { phone: string }
);

export type CreateQuoteResult =
  | { kind: 'created'; folio: string; duplicate: boolean }
  | { kind: 'invalid_items'; items: string[] };

export type SubmitQuoteDeps = {
  allowedOrigins: readonly string[];
  verifyTurnstile(token: string, ip: string | null): Promise<boolean>;
  hashIp(ip: string): Promise<string>;
  rateLimit(): Promise<RateLimit>;
  countRecent(filter: RecentFilter): Promise<number>;
  createQuoteRequest(payload: CreateQuotePayload): Promise<CreateQuoteResult>;
  now?: () => Date;
  /** Error log without personal data: only where it failed. */
  logError?: (where: string, error: unknown) => void;
};

/** Input of create_quote_request (Schema §8.1). */
export type CreateQuotePayload = Omit<QuoteSubmission, 'turnstileToken' | 'privacyAccepted'> & {
  meta: { ipHash: string | null; userAgent: string | null };
};

const HOUR = 60 * 60 * 1000;
const USER_AGENT_MAX = 500;

/** Zod issues → { "customer.phone": "Faltan dígitos: deben ser 10.", … }, first message per field. */
function fieldsOf(issues: readonly { path: readonly PropertyKey[]; message: string }[]) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || 'body';
    fields[key] ??= issue.message;
  }
  return fields;
}

export function createSubmitQuoteHandler(deps: SubmitQuoteDeps) {
  const now = deps.now ?? (() => new Date());
  const logError = deps.logError ?? (() => {});
  const schema = createQuoteSubmissionSchema({ now });

  return async function handle(request: Request): Promise<Response> {
    const origin = request.headers.get('origin');
    const cors = corsHeaders(origin, deps.allowedOrigins);
    const reply = (status: number, body: unknown) => json(status, body, cors);

    // 1. CORS: a browser from another site never gets in.
    if (origin && !deps.allowedOrigins.includes(origin)) {
      return json(403, { error: 'forbidden_origin' });
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply(400, { error: 'validation_error', fields: { body: 'JSON inválido.' } });
    }

    try {
      // 2. Turnstile, before reading anything else.
      const ip = clientIp(request);
      const token = (body as { turnstileToken?: unknown } | null)?.turnstileToken;
      if (typeof token !== 'string' || token === '' || !(await deps.verifyTurnstile(token, ip))) {
        return reply(403, { error: 'turnstile_failed' });
      }

      // 3. The same rules as the form (packages/shared).
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return reply(400, { error: 'validation_error', fields: fieldsOf(parsed.error.issues) });
      }
      const submission = parsed.data;

      // 4. Rate limit: requests of the last hour by IP hash and by phone.
      const ipHash = ip ? await deps.hashIp(ip) : null;
      const since = new Date(now().getTime() - HOUR);
      const excludeRequestId = submission.clientRequestId;
      const [limit, byIp, byPhone] = await Promise.all([
        deps.rateLimit(),
        ipHash ? deps.countRecent({ ipHash, since, excludeRequestId }) : 0,
        deps.countRecent({ phone: submission.customer.phone, since, excludeRequestId }),
      ]);
      if (byIp >= limit.perIpHour || byPhone >= limit.perPhoneHour) {
        return reply(429, { error: 'rate_limited' });
      }

      // 5. One transaction in the database.
      // Everything validated except the token and the privacy box (privacy_accepted_at is now()).
      const result = await deps.createQuoteRequest({
        clientRequestId: submission.clientRequestId,
        customer: submission.customer,
        neededBy: submission.neededBy,
        deliveryMethod: submission.deliveryMethod,
        requiresInvoice: submission.requiresInvoice,
        note: submission.note,
        privacyVersion: submission.privacyVersion,
        items: submission.items,
        meta: {
          ipHash,
          userAgent: request.headers.get('user-agent')?.slice(0, USER_AGENT_MAX) || null,
        },
      });
      if (result.kind === 'invalid_items') {
        return reply(409, { error: 'invalid_items', fields: { items: result.items } });
      }
      return result.duplicate
        ? reply(200, { folio: result.folio, duplicate: true })
        : reply(201, { folio: result.folio });
    } catch (error) {
      logError('submit-quote', error);
      return reply(500, { error: 'internal_error' });
    }
  };
}
