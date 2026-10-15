import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminGate } from './AdminGate';
import { AdminHeader } from './AdminHeader';
import { LoginPage } from './LoginPage';

const nav = vi.hoisted(() => ({ search: '', pathname: '/admin', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => nav.pathname,
}));

type Row = { role: 'admin' | 'editor'; full_name: string; is_active: boolean } | null;

const sb = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  row: null as Row,
  signInError: null as null | { code?: string; status?: number },
  auth: {} as Record<string, ReturnType<typeof vi.fn>>,
  eq: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  getSupabase: () => ({
    auth: sb.auth,
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          sb.eq(...args);
          return { maybeSingle: async () => ({ data: sb.row, error: null }) };
        },
      }),
    }),
  }),
}));

const ANA = { id: 'u1', email: 'ana@pyp.test' };

beforeEach(() => {
  nav.search = '';
  nav.pathname = '/admin';
  nav.replace.mockReset();
  sb.session = null;
  sb.row = null;
  sb.signInError = null;
  sb.eq.mockReset();
  sb.auth = {
    getSession: vi.fn(async () => ({ data: { session: sb.session } })),
    signInWithPassword: vi.fn(async () =>
      sb.signInError
        ? { data: { user: null }, error: sb.signInError }
        : { data: { user: ANA }, error: null },
    ),
    signInWithOtp: vi.fn(async () => ({ data: {}, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  };
});

async function fillAndEnter(password = 'secreta-de-prueba') {
  const user = userEvent.setup();
  render(<LoginPage />);
  await user.type(screen.getByLabelText(/Correo/), 'ana@pyp.test');
  await user.type(screen.getByLabelText(/Contraseña/), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  return user;
}

describe('LoginPage', () => {
  it('asks for the email and the password before trying', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByLabelText(/Correo/)).toHaveAccessibleDescription(
      'Escribe tu correo completo.',
    );
    expect(screen.getByLabelText(/Contraseña/)).toHaveAccessibleDescription(
      'Escribe tu contraseña.',
    );
    expect(sb.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('says so when the credentials are wrong', async () => {
    sb.signInError = { code: 'invalid_credentials', status: 400 };
    await fillAndEnter();
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('signs out at once someone who is not staff', async () => {
    sb.row = null;
    await fillAndEnter();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta no tiene acceso al panel.',
    );
    expect(sb.auth.signOut).toHaveBeenCalled();
    expect(sb.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('lets active staff in and goes back to where they were', async () => {
    nav.search = '?next=%2Fadmin%2Fsolicitudes';
    sb.row = { role: 'editor', full_name: 'Ana López', is_active: true };
    await fillAndEnter();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/admin/solicitudes'));
    expect(sb.auth.signOut).not.toHaveBeenCalled();
  });

  it('keeps an inactive staff member out', async () => {
    sb.row = { role: 'admin', full_name: 'Ana', is_active: false };
    await fillAndEnter();
    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene acceso');
    expect(sb.auth.signOut).toHaveBeenCalled();
  });

  it('sends a magic link without creating accounts and without saying who exists', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/Correo/), 'quien@ejemplo.test');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace mágico' }));
    expect(sb.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'quien@ejemplo.test',
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si quien@ejemplo.test tiene acceso, le llegará un enlace',
    );
  });

  it('explains why the visitor is back at the login', () => {
    nav.search = '?motivo=sin-acceso';
    render(<LoginPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Tu cuenta no tiene acceso al panel.');
  });
});

describe('AdminGate', () => {
  const panel = () =>
    render(
      <AdminGate>
        <AdminHeader />
        <p>Contenido del panel</p>
      </AdminGate>,
    );

  it('sends a visitor without session to the login, remembering the page', async () => {
    nav.pathname = '/admin/productos';
    panel();
    expect(screen.getByRole('status')).toHaveTextContent('Revisando tu acceso…');
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith('/admin/login?next=%2Fadmin%2Fproductos'),
    );
    expect(screen.queryByText('Contenido del panel')).toBeNull();
  });

  it('signs out a session that is not staff and never shows the panel', async () => {
    sb.session = { user: ANA };
    sb.row = null;
    panel();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/admin/login?motivo=sin-acceso'));
    expect(sb.auth.signOut).toHaveBeenCalled();
    expect(screen.queryByText('Contenido del panel')).toBeNull();
  });

  it('shows the panel to staff and signs out from the header', async () => {
    sb.session = { user: ANA };
    sb.row = { role: 'admin', full_name: 'Ana López', is_active: true };
    panel();
    expect(await screen.findByText('Contenido del panel')).toBeVisible();
    expect(screen.getByText('Ana López')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/admin/login?motivo=salida'));
    expect(sb.auth.signOut).toHaveBeenCalled();
  });
});
