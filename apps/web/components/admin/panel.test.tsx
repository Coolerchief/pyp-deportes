import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminHome } from './AdminHome';
import { AdminBottomNav, AdminSidebar } from './AdminNav';
import { SectionPlaceholder } from './SectionPlaceholder';

// T4.2: panel frame and home, with the session and Supabase stubbed.

const nav = vi.hoisted(() => ({ pathname: '/admin' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const session = vi.hoisted(() => ({
  staff: { userId: 'u1', email: 'ana@pyp.test', fullName: 'Ana López', role: 'admin' },
  signOut: vi.fn(),
}));
vi.mock('./AdminGate', () => ({ useAdminSession: () => session }));

type Result = { data: unknown; error: unknown };
const db = vi.hoisted(() => ({
  stats: null as unknown as Result,
  pending: null as unknown as Result,
  last: null as unknown as Result,
  calls: 0,
}));
vi.mock('@/lib/supabase/browser', () => ({
  getSupabase: () => ({
    rpc: async (name: string) => {
      if (name === 'admin_dashboard_stats') db.calls += 1;
      return name === 'admin_dashboard_stats' ? db.stats : db.pending;
    },
    from: () => {
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => db.last,
      };
      return query;
    },
  }),
}));

const STATS = {
  newCount: 3,
  last7Days: 5,
  last30Days: 12,
  byStatus: { new: 3, in_progress: 2, quoted: 4, won: 2, lost: 1 },
  productsWithoutPhoto: 56,
  topProducts: [
    { productId: 'p1', name: 'Balón de Fútbol No. 5', sku: 'BAL-001', pieces: 40, requests: 2 },
    { productId: 'p2', name: 'Espinilleras Pro', sku: 'ESP-002', pieces: 1, requests: 1 },
  ],
};

const run = (status: string, error: string | null = null) => ({
  data: {
    status,
    reason: 'manual',
    created_at: '2026-10-14T16:00:00Z',
    finished_at: status === 'success' || status === 'failed' ? '2026-10-14T16:03:00Z' : null,
    error,
    run_url: null,
  },
  error: null,
});

beforeEach(() => {
  nav.pathname = '/admin';
  session.staff.role = 'admin';
  db.stats = { data: STATS, error: null };
  db.pending = { data: false, error: null };
  db.last = run('success');
  db.calls = 0;
});

const card = (title: string) => screen.getByRole('heading', { name: title }).closest('section')!;

describe('AdminHome', () => {
  it('shows new requests and the week first', async () => {
    render(<AdminHome />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el inicio…');
    expect(await screen.findByRole('heading', { name: 'Solicitudes nuevas' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Hola, Ana López' })).toBeVisible();

    const fresh = card('Solicitudes nuevas');
    expect(within(fresh).getByText('3')).toBeVisible();
    expect(within(fresh).getByRole('link', { name: 'Ver nuevas' })).toHaveAttribute(
      'href',
      '/admin/solicitudes?estado=new',
    );
    const week = card('Esta semana');
    expect(within(week).getByText('5')).toBeVisible();
    expect(within(week).getByText(/En 30 días: 12\./)).toBeVisible();
    expect(within(card('Productos sin foto')).getByText('56')).toBeVisible();

    const byStatus = card('Solicitudes por estado');
    expect(within(byStatus).getByRole('link', { name: 'Ganada: 2' })).toHaveAttribute(
      'href',
      '/admin/solicitudes?estado=won',
    );
    expect(within(byStatus).getByText('12 solicitudes en total')).toBeVisible();

    const top = card('Lo más pedido');
    expect(within(top).getByText('Balón de Fútbol No. 5')).toBeVisible();
    expect(within(top).getByText('40 piezas')).toBeVisible();
    expect(within(top).getByText('1 pieza')).toBeVisible();
  });

  it('says whether everything is published and when the last publish ran', async () => {
    render(<AdminHome />);
    const publish = await screen.findByRole('heading', { name: 'Publicación' });
    const section = publish.closest('section')!;
    expect(within(section).getByText('Todo está publicado.')).toBeVisible();
    expect(
      within(section).getByText('Última publicación: publicado · 14 oct, 10:03'),
    ).toBeVisible();
    // Publishing from the panel arrives in T4.10.
    expect(within(section).getByRole('button', { name: 'Publicar cambios' })).toBeDisabled();
  });

  it('warns about pending changes and a failed publish', async () => {
    db.pending = { data: true, error: null };
    db.last = run('failed', 'El build no terminó.');
    render(<AdminHome />);
    expect(await screen.findByText('La última publicación falló.')).toBeVisible();
    expect(screen.getByText('Los cambios siguen sin llegar al sitio.')).toBeVisible();
    expect(screen.getByText('El build no terminó.')).toBeVisible();
  });

  it('shows pending changes before the first publish and an empty top list', async () => {
    db.pending = { data: true, error: null };
    db.last = { data: null, error: null };
    db.stats = { data: { ...STATS, topProducts: [] }, error: null };
    render(<AdminHome />);
    expect(await screen.findByText('Hay cambios sin publicar.')).toBeVisible();
    expect(screen.getByText('Aún no hay publicaciones registradas.')).toBeVisible();
    expect(screen.getByText('Aún no hay solicitudes en los últimos 30 días.')).toBeVisible();
  });

  it('explains a failure and retries', async () => {
    db.stats = { data: null, error: new Error('red') };
    render(<AdminHome />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el inicio.');
    db.stats = { data: STATS, error: null };
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { name: 'Solicitudes nuevas' })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refreshes the numbers', async () => {
    render(<AdminHome />);
    await screen.findByRole('heading', { name: 'Solicitudes nuevas' });
    db.stats = { data: { ...STATS, newCount: 4 }, error: null };
    await userEvent.setup().click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(within(card('Solicitudes nuevas')).getByText('4')).toBeVisible());
    expect(db.calls).toBe(2);
  });
});

describe('AdminNav', () => {
  it('lists every section in the side bar and marks the current one', () => {
    nav.pathname = '/admin/productos';
    render(<AdminSidebar />);
    const links = within(screen.getByRole('navigation', { name: 'Secciones del panel' }))
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links).toEqual([
      'Inicio',
      'Solicitudes',
      'Productos',
      'Galería',
      'Fotos del sitio',
      'Textos',
      'Catálogos',
      'Ajustes',
    ]);
    expect(screen.getByRole('link', { name: 'Productos' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
  });

  it('hides Ajustes from editors', () => {
    session.staff.role = 'editor';
    render(<AdminSidebar />);
    expect(screen.queryByRole('link', { name: 'Ajustes' })).toBeNull();
  });

  it('keeps three sections in the bottom bar and the rest under "Más"', async () => {
    nav.pathname = '/admin/textos';
    render(<AdminBottomNav />);
    const bar = screen.getByRole('navigation', { name: 'Secciones del panel' });
    expect(
      within(bar)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Inicio', 'Solicitudes', 'Productos']);
    const more = within(bar).getByRole('button', { name: 'Más' });
    const user = userEvent.setup();
    await user.click(more);
    const sheet = screen.getByRole('dialog', { name: 'Más secciones' });
    expect(within(sheet).getByText('Ana López · Administrador')).toBeVisible();
    expect(within(sheet).getByRole('link', { name: 'Textos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await user.click(within(sheet).getByRole('link', { name: 'Galería' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('SectionPlaceholder', () => {
  it('says the section is coming', () => {
    render(<SectionPlaceholder id="productos" summary="Aquí darás de alta productos." />);
    expect(screen.getByRole('heading', { name: 'Productos' })).toBeVisible();
    expect(screen.getByText('Esta sección estará disponible pronto.')).toBeVisible();
  });

  it('tells an editor that Ajustes is for admins', () => {
    session.staff.role = 'editor';
    render(<SectionPlaceholder id="ajustes" summary="Ajustes." />);
    expect(screen.getByText('Solo un administrador puede abrir Ajustes.')).toBeVisible();
    expect(screen.queryByText('Ajustes.')).toBeNull();
  });
});
