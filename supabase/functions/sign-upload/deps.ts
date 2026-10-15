// The real dependencies of sign-upload: is_staff() through PostgREST with the caller's own token
// (no service role: RLS and the JWT check of PostgREST decide), and SigV4 URLs for R2.

import { parseAllowedOrigins } from '../_shared/http.ts';
import { presignUrl } from '../_shared/sigv4.ts';
import type { Caller, SignUploadDeps } from './handler.ts';

export type SignUploadEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  ALLOWED_ORIGINS?: string;
};

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
] as const;

/** Names of the missing secrets (never their values). */
export function missingEnv(env: SignUploadEnv): string[] {
  return REQUIRED.filter((name) => !env[name]?.trim());
}

/** R2's S3 endpoint for a key: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>. */
export function r2ObjectUrl(accountId: string, bucket: string, key: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

export function createSignUploadDeps(
  env: Required<Pick<SignUploadEnv, (typeof REQUIRED)[number]>> & SignUploadEnv,
  doFetch: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): SignUploadDeps {
  const rest = `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;
  return {
    allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
    async whoIs(token): Promise<Caller> {
      const response = await doFetch(`${rest}/rpc/is_staff`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      // PostgREST answers 401 to a token that is expired, forged or from another project.
      if (response.status === 401) return 'unauthenticated';
      if (!response.ok) throw new Error(`is_staff respondió ${response.status}`);
      return (await response.json()) === true ? 'staff' : 'not_staff';
    },
    presignPut(key, headers, expiresIn) {
      return presignUrl({
        method: 'PUT',
        url: r2ObjectUrl(env.R2_ACCOUNT_ID, env.R2_BUCKET, key),
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        region: 'auto',
        at: now(),
        expiresIn,
        headers,
      });
    },
    logError: (where, error) =>
      console.error(`sign-upload: ${where}`, error instanceof Error ? error.message : error),
  };
}
