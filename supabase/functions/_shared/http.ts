// HTTP helpers shared by the Edge Functions: CORS with an allowlist (TRD §13) and uniform JSON
// responses ({ error, fields? } for failures).

/** Used when ALLOWED_ORIGINS is not set (TRD §13). */
export const DEFAULT_ALLOWED_ORIGINS = [
  'https://pypdeportescoapa.com',
  'https://www.pypdeportescoapa.com',
  'http://localhost:3000',
] as const;

/** "https://a.com, https://b.com" → ['https://a.com', 'https://b.com']; empty → the defaults. */
export function parseAllowedOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return origins.length > 0 ? origins : [...DEFAULT_ALLOWED_ORIGINS];
}

/** CORS headers for an allowed origin; none for anything else (the browser blocks it). */
export function corsHeaders(
  origin: string | null,
  allowed: readonly string[],
): Record<string, string> {
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** The client's IP as the Supabase edge reports it, or null. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    forwarded ||
    null
  );
}

/** Hex SHA-256 of the IP plus a secret salt: the IP is never stored in clear (Schema §9.1). */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + salt));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
