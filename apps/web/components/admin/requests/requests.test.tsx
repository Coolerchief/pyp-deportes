import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestDetail, RequestRow } from '@/lib/admin/requests';
import { RequestDetailPage } from './RequestDetailPage';
import { RequestsPage } from './RequestsPage';

// T4.7: inbox and detail with the data layer stubbed (lib/admin/requests is tested on its own).

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/admin/solicitudes',
}));
vi.mock('@/lib/supabase/browser', () => ({ getSupabase: () => ({}) }));
vi.mock('../AdminGate', () => ({
  useAdminSession: () => ({
    staff: { userId: 'u1', email: 'ana@pyp.test', fullName: 'Ana', role: 'editor' },
    signOut: vi.fn(),
  }),
}));
const data = vi.hoisted(() => ({
  listRequests: vi.fn(),
  countByStatus: vi.fn(),
  exportRequests: vi.fn(),
  fetchRequest: vi.fn(),
  setRequestStatus: vi.fn(),
  setRequestNote: vi.fn(),
  staffNames: vi.fn(),
}));
vi.mock('@/lib/admin/requests', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/admin/requests')>()),
  ...data,
}));
const download = vi.hoisted(() => vi.fn());
vi.mock('@/lib/admin/importer', () => ({ downloadText: download }));

const ROW: RequestRow = {
  id: '0b6f0b6f-0000-4000-8000-000000000001',
  folio: 'PYP-2026-000123',
  createdAt: '2026-10-14T16:32:00Z',
  customerName: 'Laura Gómez',
  customerPhone: '5512345678',
  customerType: 'league_team',
  organization: 'Liga Coapa',
  totalPieces: 40,
  status: 'new',
  neededBy: '2026-11-20',
};

const DETAIL: RequestDetail = {
  ...ROW,
  deliveryMethod: 'pickup',
  storeName: 'Coapa',
  requiresInvoice: true,
  note: 'Con número en la espalda',
  lostReason: null,
  internalNote: '',
  lines: [
    {
      lineNo: 1,
      productId: 'p1',
      productName: 'Uniforme de Fútbol',
      sku: 'UNI-001-M',
      variantLabel: 'M',
      quantity: 40,
      personalize: true,
      notes: 'Escudo al frente',
    },
  ],
  history: [
    {
      id: 1,
      fromStatus: null,
      toStatus: 'new',
      changedBy: null,
      note: '',
      createdAt: ROW.createdAt,
    },
  ],
};

beforeEach(() => {
  nav.search = '';
  nav.replace.mockReset();
  download.mockReset();
  for (const fn of Object.values(data)) fn.mockReset();
  data.listRequests.mockResolvedValue({ rows: [ROW], total: 1 });
  data.countByStatus.mockResolvedValue({ new: 5, in_progress: 2, quoted: 3, won: 2, lost: 0 });
  data.staffNames.mockResolvedValue(new Map());
});

describe('RequestsPage', () => {
  it('answers how many requests came this month and how many were won', async () => {
    nav.search = 'periodo=mes';
    render(<RequestsPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando solicitudes…');
    expect(await screen.findByText(/12 solicitudes · 2 ganadas \(17 %\)/)).toBeVisible();
    expect(screen.getByText('Este mes:')).toBeVisible();
    const chips = screen.getByRole('group', { name: 'Estado' });
    expect(within(chips).getByRole('button', { name: 'Todas (12)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(chips).getByRole('button', { name: 'Ganada (2)' })).toBeVisible();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('link', { name: 'PYP-2026-000123' })).toHaveAttribute(
      'href',
      '/admin/solicitudes/detalle?id=0b6f0b6f-0000-4000-8000-000000000001',
    );
    expect(within(table).getByText('Liga o equipo')).toBeVisible();
  });

  it('keeps the filters in the URL', async () => {
    const user = userEvent.setup();
    render(<RequestsPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: /^Ganada/ }));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/solicitudes?estado=won');
    await user.selectOptions(screen.getByLabelText('Periodo'), 'Mes pasado');
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/solicitudes?periodo=mes-pasado');
    await user.type(screen.getByRole('searchbox'), '5512{Enter}');
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/solicitudes?q=5512');
    await user.selectOptions(screen.getByLabelText('Periodo'), 'Elegir fechas…');
    expect(nav.replace.mock.lastCall?.[0]).toMatch(
      /\?desde=\d{4}-\d{2}-01&hasta=\d{4}-\d{2}-\d{2}$/,
    );
  });

  it('exports the filtered requests as CSV', async () => {
    data.exportRequests.mockResolvedValue([
      {
        folio: 'PYP-2026-000123',
        created_at: ROW.createdAt,
        status: 'new',
        customer_name: 'Laura Gómez',
        customer_phone: '5512345678',
        customer_type: 'league_team',
        organization: null,
        total_pieces: 40,
        needed_by: '2026-11-20',
        delivery_method: 'pickup',
        requires_invoice: false,
        note: '',
        lost_reason: null,
        internal_note: '',
      },
    ]);
    const user = userEvent.setup();
    render(<RequestsPage />);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    await waitFor(() => expect(download).toHaveBeenCalled());
    expect(download.mock.calls[0]![0]).toBe('solicitudes.csv');
    expect(download.mock.calls[0]![1]).toContain('PYP-2026-000123');
  });

  it('says when nothing matches and offers to see all', async () => {
    nav.search = 'estado=lost';
    data.listRequests.mockResolvedValue({ rows: [], total: 0 });
    const user = userEvent.setup();
    render(<RequestsPage />);
    expect(await screen.findByText('Ninguna solicitud con estos filtros')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Ver todas' }));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/solicitudes');
  });
});

describe('RequestDetailPage', () => {
  beforeEach(() => {
    nav.search = `id=${ROW.id}`;
    data.fetchRequest.mockResolvedValue(DETAIL);
  });

  it('shows the customer, the lines and the chat link', async () => {
    render(<RequestDetailPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'PYP-2026-000123' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Abrir chat/ })).toHaveAttribute(
      'href',
      'https://wa.me/525512345678?text=Hola%20Laura%2C%20te%20escribo%20por%20tu%20solicitud%20PYP-2026-000123.',
    );
    expect(screen.getByRole('link', { name: '55 1234 5678' })).toHaveAttribute(
      'href',
      'tel:+525512345678',
    );
    expect(screen.getByText('Recoger en tienda Coapa (Coapa)')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Uniforme de Fútbol' })).toHaveAttribute(
      'href',
      '/admin/productos/editar?id=p1',
    );
    expect(screen.getByText('UNI-001-M · M · Personalizar')).toBeVisible();
    expect(screen.getByText('Llegó como nueva').closest('li')).toHaveTextContent('por el sitio');
  });

  it('offers only the allowed changes and asks for the reason when lost', async () => {
    const changed = { ...DETAIL, status: 'in_progress' as const };
    data.setRequestStatus.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RequestDetailPage />);
    const group = await screen.findByRole('group', { name: 'Cambiar estado' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Pasar a en atención', 'Pasar a cotizada', 'Marcar como perdida']);

    await user.click(within(group).getByRole('button', { name: 'Marcar como perdida' }));
    const confirm = screen.getAllByRole('button', { name: 'Marcar como perdida' }).at(-1)!;
    await user.click(confirm);
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe el motivo');
    expect(data.setRequestStatus).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/Motivo/), 'Precio');
    await user.click(confirm);
    await waitFor(() =>
      expect(data.setRequestStatus).toHaveBeenCalledWith({}, ROW.id, 'lost', {
        note: '',
        lostReason: 'Precio',
      }),
    );

    data.fetchRequest.mockResolvedValue(changed);
    await user.type(screen.getByLabelText(/Nota del cambio/), 'Le marqué');
    await user.click(screen.getByRole('button', { name: 'Pasar a en atención' }));
    expect(await screen.findByText('Ahora está en atención.')).toBeVisible();
  });

  it('saves the internal note', async () => {
    data.setRequestNote.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RequestDetailPage />);
    const note = await screen.findByLabelText('Nota interna');
    expect(screen.getByRole('button', { name: 'Guardar nota' })).toBeDisabled();
    await user.type(note, 'Pagó anticipo');
    await user.click(screen.getByRole('button', { name: 'Guardar nota' }));
    expect(await screen.findByText('Nota guardada.')).toBeVisible();
    expect(data.setRequestNote).toHaveBeenCalledWith({}, ROW.id, 'Pagó anticipo');
  });

  it('says when the request does not exist', async () => {
    data.fetchRequest.mockResolvedValue(null);
    render(<RequestDetailPage />);
    expect(
      await screen.findByRole('heading', { name: 'No encontramos esta solicitud' }),
    ).toBeVisible();
  });
});
