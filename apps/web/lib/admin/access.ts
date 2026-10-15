import type { Database } from '@pyp/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

// Access to the panel (APP-FLOW §8.1): a Supabase session is not enough, the person must have
// an active row in staff_members. RLS lets each one read only their own row, so a user who is
// not staff simply gets nothing back.

export type StaffRole = Database['public']['Enums']['staff_role'];
export type Staff = { userId: string; email: string | null; fullName: string; role: StaffRole };

export const ADMIN_ROUTES = {
  home: '/admin',
  login: '/admin/login',
} as const;

/** ?motivo= on the login page: why the visitor is there. */
export type LoginReason = 'sin-acceso' | 'salida' | 'sesion';

export const LOGIN_MESSAGES: Record<LoginReason, string> = {
  'sin-acceso':
    'Tu cuenta no tiene acceso al panel. Pide a un administrador que te invite. Cerramos tu sesión.',
  salida: 'Cerraste sesión.',
  sesion: 'Tu sesión terminó. Entra de nuevo.',
};

export function loginReason(value: string | null): LoginReason | null {
  return value && value in LOGIN_MESSAGES ? (value as LoginReason) : null;
}

/** Where to go after logging in: only a path inside /admin (never another site). */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/admin') || value.startsWith('/admin/login')) {
    return ADMIN_ROUTES.home;
  }
  // "/admin//evil.com" or "/admin\\evil" could be read as another host.
  return /^\/admin(\/[^/\\]|\?|#|$)/.test(value) ? value : ADMIN_ROUTES.home;
}

export function loginHref(next?: string, reason?: LoginReason): string {
  const params = new URLSearchParams();
  if (next && safeNext(next) !== ADMIN_ROUTES.home) params.set('next', next);
  if (reason) params.set('motivo', reason);
  const query = params.toString();
  return query ? `${ADMIN_ROUTES.login}?${query}` : ADMIN_ROUTES.login;
}

type AuthErrorLike = { code?: string; status?: number; name?: string; message?: string };

/** Supabase Auth errors in plain Spanish (UI/UX §10); never says which part was wrong. */
export function authErrorMessage(error: AuthErrorLike): string {
  if (error.code === 'invalid_credentials' || error.message === 'Invalid login credentials') {
    return 'Correo o contraseña incorrectos.';
  }
  if (error.code === 'email_not_confirmed') {
    return 'Confirma tu correo con el enlace que te enviamos y vuelve a intentarlo.';
  }
  if (error.status === 429 || error.code?.startsWith('over_')) {
    return 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'No pudimos iniciar sesión. Inténtalo de nuevo.';
}

/** The staff member behind a session, or null when they have no active row. */
export async function fetchStaff(
  supabase: SupabaseClient<Database>,
  user: { id: string; email?: string | null },
): Promise<Staff | null> {
  const { data, error } = await supabase
    .from('staff_members')
    .select('role, full_name, is_active')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.is_active) return null;
  return { userId: user.id, email: user.email ?? null, fullName: data.full_name, role: data.role };
}

export const roleLabels: Record<StaffRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
};
