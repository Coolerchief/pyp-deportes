'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/brand';
import { Spinner } from '@/components/ui/Spinner';
import { fetchStaff, type LoginReason, loginHref, type Staff } from '@/lib/admin/access';
import { getSupabase } from '@/lib/supabase/browser';

type AdminSession = { staff: Staff; signOut: () => Promise<void> };

const SessionContext = createContext<AdminSession | null>(null);

/** The signed-in staff member and "Cerrar sesión"; only inside AdminGate. */
export function useAdminSession(): AdminSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useAdminSession fuera de AdminGate.');
  return session;
}

type GateState =
  { status: 'checking' } | { status: 'ready'; staff: Staff } | { status: 'error'; message: string };

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gis flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo width={160} />
      {children}
    </div>
  );
}

/**
 * Protects every /admin route but the login (APP-FLOW §8.1): without a session it goes to
 * /admin/login?next=…; with a session of someone who is not active staff it signs out and
 * says so. Only the UI is guarded here: RLS and the admin_* functions are the real security.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GateState>({ status: 'checking' });
  // Set when the panel itself signs out, so the SIGNED_OUT event does not read as an expiry.
  const leaving = useRef(false);

  async function leave(reason: LoginReason) {
    leaving.current = true;
    await getSupabase()?.auth.signOut();
    router.replace(loginHref(undefined, reason));
  }

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    const fail = (message: string) => {
      if (active) setState({ status: 'error', message });
    };
    if (!supabase) {
      // Async so the state never changes during the effect itself.
      void Promise.resolve().then(() =>
        fail('El panel no está configurado: falta la conexión con Supabase en este build.'),
      );
      return;
    }

    async function check() {
      const { data } = await supabase!.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace(loginHref(pathname));
        return;
      }
      try {
        const staff = await fetchStaff(supabase!, user);
        if (!active) return;
        if (!staff) {
          await leave('sin-acceso');
          return;
        }
        setState({ status: 'ready', staff });
      } catch {
        fail('No pudimos revisar tu acceso. Revisa tu conexión y recarga la página.');
      }
    }
    void check();

    // Signing out here or in another tab sends back to the login.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && active && !leaving.current) {
        router.replace(loginHref(undefined, 'sesion'));
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // The check runs once per mount; moving inside the panel keeps the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === 'checking') {
    return (
      <Centered>
        <p role="status" className="type-body text-grafito flex items-center gap-2">
          <Spinner /> Revisando tu acceso…
        </p>
      </Centered>
    );
  }
  if (state.status === 'error') {
    return (
      <Centered>
        <p role="alert" className="type-body text-rojo-profundo max-w-sm font-medium">
          {state.message}
        </p>
      </Centered>
    );
  }
  return (
    <SessionContext.Provider value={{ staff: state.staff, signOut: () => leave('salida') }}>
      {children}
    </SessionContext.Provider>
  );
}
