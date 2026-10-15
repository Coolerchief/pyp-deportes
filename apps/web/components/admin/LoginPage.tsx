'use client';

import { CircleAlert, CircleCheck, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/brand';
import { FormField } from '@/components/ui';
import {
  authErrorMessage,
  fetchStaff,
  LOGIN_MESSAGES,
  loginReason,
  safeNext,
} from '@/lib/admin/access';
import { getSupabase } from '@/lib/supabase/browser';
import { Button } from './ui/button';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Notice = { tone: 'error' | 'info'; text: string };

function NoticeBox({ notice }: { notice: Notice }) {
  const error = notice.tone === 'error';
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={
        error
          ? 'border-rojo-profundo text-rojo-profundo flex gap-2 rounded-sm border-2 bg-blanco p-3'
          : 'border-linea text-noche flex gap-2 rounded-sm border bg-blanco p-3'
      }
    >
      <Icon
        aria-hidden="true"
        className={error ? 'mt-0.5 size-5 shrink-0' : 'text-exito mt-0.5 size-5 shrink-0'}
      />
      <p className="type-small font-medium">{notice.text}</p>
    </div>
  );
}

/**
 * /admin/login (APP-FLOW §8.1, UI/UX §9): email and password, or a magic link. Only active
 * staff get in; anyone else is signed out right away with "Tu cuenta no tiene acceso". There is
 * no sign-up: an admin invites people from Ajustes → Usuarios.
 */
export function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const reason = loginReason(params.get('motivo'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState<Notice | null>(
    reason
      ? { tone: reason === 'sin-acceso' ? 'error' : 'info', text: LOGIN_MESSAGES[reason] }
      : null,
  );
  const [busy, setBusy] = useState<'password' | 'link' | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  // Already inside with a valid staff session: straight to the panel.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || reason === 'sin-acceso') return;
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user || !active) return;
      const staff = await fetchStaff(supabase, user).catch(() => null);
      if (staff && active) router.replace(next);
    });
    return () => {
      active = false;
    };
  }, [next, reason, router]);

  useEffect(() => {
    if (notice?.tone === 'error') noticeRef.current?.focus();
  }, [notice]);

  function validEmail(): boolean {
    const ok = EMAIL.test(email.trim());
    setErrors((e) => ({ ...e, email: ok ? undefined : 'Escribe tu correo completo.' }));
    return ok;
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    const emailOk = validEmail();
    const passwordOk = password.length > 0;
    setErrors({
      email: emailOk ? undefined : 'Escribe tu correo completo.',
      password: passwordOk ? undefined : 'Escribe tu contraseña.',
    });
    if (!emailOk || !passwordOk) return;
    const supabase = getSupabase();
    if (!supabase) {
      setNotice({ tone: 'error', text: 'El panel no está configurado en este build.' });
      return;
    }
    setBusy('password');
    setNotice(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      setBusy(null);
      setNotice({ tone: 'error', text: authErrorMessage(error ?? {}) });
      return;
    }
    try {
      const staff = await fetchStaff(supabase, data.user);
      if (!staff) {
        await supabase.auth.signOut();
        setBusy(null);
        setPassword('');
        setNotice({ tone: 'error', text: LOGIN_MESSAGES['sin-acceso'] });
        return;
      }
      router.replace(next);
    } catch {
      await supabase.auth.signOut();
      setBusy(null);
      setNotice({
        tone: 'error',
        text: 'No pudimos revisar tu acceso. Revisa tu conexión e inténtalo de nuevo.',
      });
    }
  }

  async function sendLink() {
    if (!validEmail()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy('link');
    setNotice(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // No sign-up from here: an unknown address gets nothing (and is not told so).
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${next}` },
    });
    setBusy(null);
    if (error && (error.status === 429 || error.code?.startsWith('over_'))) {
      setNotice({ tone: 'error', text: authErrorMessage(error) });
      return;
    }
    setNotice({
      tone: 'info',
      text: `Si ${email.trim()} tiene acceso, le llegará un enlace para entrar. Ábrelo en este mismo dispositivo.`,
    });
  }

  return (
    <main className="bg-gis flex min-h-svh items-start justify-center px-4 py-10 sm:items-center">
      <div className="border-linea flex w-full max-w-sm flex-col gap-6 rounded-sm border bg-blanco p-6 shadow-card">
        <div className="flex flex-col items-center gap-3">
          <Logo width={180} />
          <h1 className="type-h3 text-noche">Panel de administración</h1>
        </div>
        {notice && (
          <div
            ref={noticeRef}
            tabIndex={-1}
            className="focus-visible:shadow-none focus-visible:outline-none"
          >
            <NoticeBox notice={notice} />
          </div>
        )}
        <form noValidate onSubmit={signIn} className="flex flex-col gap-4">
          <FormField
            label="Correo"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <FormField
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <Button
            type="submit"
            loading={busy === 'password'}
            loadingText="Entrando…"
            disabled={busy !== null}
          >
            Entrar
          </Button>
        </form>
        <div className="border-linea flex flex-col gap-2 border-t pt-4">
          <p className="type-small text-grafito">
            ¿Sin contraseña? Te mandamos un enlace al correo.
          </p>
          <Button
            variant="outline"
            onClick={sendLink}
            loading={busy === 'link'}
            loadingText="Enviando…"
            disabled={busy !== null}
          >
            <Mail aria-hidden="true" />
            Enviar enlace mágico
          </Button>
        </div>
        <Link href="/" className="type-small text-grafito text-center">
          Volver al sitio
        </Link>
      </div>
    </main>
  );
}
