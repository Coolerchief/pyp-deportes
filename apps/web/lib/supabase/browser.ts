'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@pyp/shared';

// The browser's Supabase client, only for /admin (TRD §8): the public site never queries the
// database at visit time (rule 1). It uses the public anon key; RLS and the admin_* functions
// decide what each staff member can do.

let client: SupabaseClient<Database> | null = null;

type Env = { url?: string; anonKey?: string };

/** null when the build has no project URL or key (the panel then says so). */
export function getSupabase(
  env: Env = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
): SupabaseClient<Database> | null {
  if (client) return client;
  const url = env.url?.trim();
  const anonKey = env.anonKey?.trim();
  if (!url || !anonKey) return null;
  client = createClient<Database>(url, anonKey, {
    auth: {
      // The session lives in localStorage and renews itself; a magic link lands on /admin with
      // the tokens in the URL, which the client reads on start.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'pyp.admin.auth',
    },
  });
  return client;
}

/** Tests only: forget the client so another one can be made. */
export function resetSupabaseForTests(): void {
  client = null;
}
