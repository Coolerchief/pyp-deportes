// Server-side Turnstile check (Siteverify). Tokens are single use and last 5 minutes.

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type Options = {
  secret: string;
  fetch?: typeof fetch;
};

/** true when Cloudflare accepts the token; throws only when Siteverify cannot be reached. */
export function createTurnstileVerifier({ secret, fetch: doFetch = fetch }: Options) {
  return async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
    const form = new FormData();
    form.set('secret', secret);
    form.set('response', token);
    if (ip) form.set('remoteip', ip);
    const response = await doFetch(SITEVERIFY_URL, { method: 'POST', body: form });
    if (!response.ok) throw new Error(`Siteverify respondió ${response.status}.`);
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  };
}
