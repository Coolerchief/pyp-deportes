// The real dependencies of submit-quote: Turnstile Siteverify and the database through PostgREST
// with the service role key.

import { hashIp, parseAllowedOrigins } from '../_shared/http.ts';
import { createPostgrestClient, PostgrestError } from '../_shared/postgrest.ts';
import { createTurnstileVerifier } from '../_shared/turnstile.ts';
import type { CreateQuoteResult, RateLimit, RecentFilter, SubmitQuoteDeps } from './handler.ts';

/** Seed value of settings.quote_rate_limit, used if the row is missing. */
export const DEFAULT_RATE_LIMIT: RateLimit = { perIpHour: 5, perPhoneHour: 5 };

export type SubmitQuoteEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  IP_HASH_SALT?: string;
  ALLOWED_ORIGINS?: string;
};

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TURNSTILE_SECRET_KEY',
  'IP_HASH_SALT',
] as const;

/** Names of the missing secrets (never their values). */
export function missingEnv(env: SubmitQuoteEnv): string[] {
  return REQUIRED.filter((name) => !env[name]?.trim());
}

/** create_quote_request raises invalid_items as check_violation with {"items": [...]} in detail. */
export function invalidItemsOf(error: unknown): string[] | null {
  if (!(error instanceof PostgrestError)) return null;
  if (error.code !== '23514' || error.message !== 'invalid_items') return null;
  try {
    const detail = JSON.parse(error.details ?? '') as { items?: unknown };
    return Array.isArray(detail.items) ? detail.items.map(String) : [];
  } catch {
    return [];
  }
}

function recentQuery({ since, excludeRequestId, ...by }: RecentFilter): string {
  const filter = 'ipHash' in by ? `ip_hash=eq.${by.ipHash}` : `customer_phone=eq.${by.phone}`;
  return [
    'select=id',
    filter,
    `created_at=gte.${encodeURIComponent(since.toISOString())}`,
    `client_request_id=neq.${excludeRequestId}`,
  ].join('&');
}

export function createSubmitQuoteDeps(
  env: Required<Pick<SubmitQuoteEnv, (typeof REQUIRED)[number]>> & SubmitQuoteEnv,
  doFetch: typeof fetch = fetch,
): SubmitQuoteDeps {
  const db = createPostgrestClient({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    fetch: doFetch,
  });
  const salt = env.IP_HASH_SALT;

  return {
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    verifyTurnstile: createTurnstileVerifier({ secret: env.TURNSTILE_SECRET_KEY, fetch: doFetch }),
    hashIp: (ip) => hashIp(ip, salt),

    async rateLimit() {
      const [row] = await db.select<{ value: { per_ip_hour?: unknown; per_phone_hour?: unknown } }>(
        'settings',
        'key=eq.quote_rate_limit&select=value',
      );
      const positive = (value: unknown, fallback: number) =>
        Number.isInteger(value) && (value as number) > 0 ? (value as number) : fallback;
      return {
        perIpHour: positive(row?.value.per_ip_hour, DEFAULT_RATE_LIMIT.perIpHour),
        perPhoneHour: positive(row?.value.per_phone_hour, DEFAULT_RATE_LIMIT.perPhoneHour),
      };
    },

    countRecent: (filter) => db.count('quote_requests', recentQuery(filter)),

    async createQuoteRequest(payload): Promise<CreateQuoteResult> {
      try {
        const result = await db.rpc<{ folio: string; duplicate: boolean }>('create_quote_request', {
          payload,
        });
        return { kind: 'created', folio: result.folio, duplicate: result.duplicate === true };
      } catch (error) {
        const items = invalidItemsOf(error);
        if (items) return { kind: 'invalid_items', items };
        throw error;
      }
    },

    logError(where, error) {
      // Only the kind of failure: no request data, no keys.
      const code = error instanceof PostgrestError ? `${error.status} ${error.code}` : '';
      console.error(where, error instanceof Error ? error.name : 'Error', code);
    },
  };
}
