import { EMPTY_QUOTE, type QuoteLine } from '@pyp/shared';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuote } from '@/lib/commerce';
import { type AddedNoticeData, useAddedNotice } from '@/lib/commerce/added-notice';
import { AddedNotice } from './AddedNotice';
import { QuoteBar } from './QuoteBar';

const nav = vi.hoisted(() => ({ pathname: '/catalogo', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push }),
}));

const line = (n: number, quantity: number, productId = 1): QuoteLine => ({
  lineId: `l${n}`,
  productId: `00000000-0000-4000-8000-${String(productId).padStart(12, '0')}`,
  variantId: `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  quantity,
  personalize: false,
  notes: '',
  snapshot: { name: 'Uniforme', sku: 'UNI-001', slug: 'uniforme', variantLabel: 'M', image: null },
  addedAt: '2026-10-13T00:00:00.000Z',
});

const notice: AddedNoticeData = {
  product: {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Uniforme de Fútbol Completo',
    sku: 'UNI-001',
    category: 'uniformes',
    categoryName: 'Uniformes',
    image: null,
  },
  personalize: true,
  lines: [
    { label: 'CH', quantity: 3 },
    { label: 'M', quantity: 6 },
  ],
  skipped: 0,
};

beforeEach(() => {
  nav.pathname = '/catalogo';
  nav.push.mockReset();
  window.localStorage.clear();
  document.documentElement.style.removeProperty('--bottom-bar');
  useQuote.setState({
    ...EMPTY_QUOTE,
    lines: [line(1, 3), line(2, 6), line(3, 33, 2)],
    hydrated: true,
  });
  useAddedNotice.setState({ notice: null, lastListing: null, opener: null });
});

describe('AddedNotice', () => {
  it('shows the product, its pieces per size, the list total and two exits', () => {
    render(<AddedNotice />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useAddedNotice.getState().show(notice));
    const dialog = screen.getByRole('dialog', { name: 'Agregado a tu cotización' });
    expect(dialog).toHaveTextContent('Uniforme de Fútbol Completo');
    expect(dialog).toHaveTextContent('UNI-001 · con personalización');
    expect(dialog).toHaveTextContent('9 piezas');
    expect(screen.getByRole('list', { name: 'Piezas por variante' })).toHaveTextContent(
      'CH× 3M× 6',
    );
    expect(dialog).toHaveTextContent('2 productos · 42 piezas');
    expect(screen.getByRole('link', { name: 'Ver mi cotización' })).toHaveAttribute(
      'href',
      '/cotizacion',
    );
    expect(screen.getByRole('link', { name: 'Ver mi cotización' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Seguir viendo el catálogo' })).toBeVisible();
  });

  it('closes with Escape and with ×', async () => {
    const user = userEvent.setup();
    render(<AddedNotice />);
    act(() => useAddedNotice.getState().show(notice));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useAddedNotice.getState().show(notice));
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"Seguir viendo el catálogo" returns to the listing the visitor came from', async () => {
    const user = userEvent.setup();
    render(<AddedNotice />);
    act(() => {
      useAddedNotice.getState().rememberListing('/deporte/futbol?categoria=balones');
      useAddedNotice.getState().show(notice);
    });
    await user.click(screen.getByRole('button', { name: 'Seguir viendo el catálogo' }));
    expect(nav.push).toHaveBeenCalledWith('/deporte/futbol?categoria=balones');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('warns when the list reached 100 lines', () => {
    render(<AddedNotice />);
    act(() => useAddedNotice.getState().show({ ...notice, skipped: 2 }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tu lista llegó al máximo de 100 renglones',
    );
  });
});

describe('QuoteBar', () => {
  it('shows products and pieces, links to the quote and lifts the WhatsApp button', () => {
    render(<QuoteBar />);
    const bar = screen.getByRole('region', { name: 'Mi cotización' });
    expect(bar).toHaveTextContent('2 productos · 42 piezas');
    expect(screen.getByRole('link', { name: 'Ver mi cotización, 42 piezas' })).toHaveAttribute(
      'href',
      '/cotizacion',
    );
    expect(document.documentElement.style.getPropertyValue('--bottom-bar')).toBe('72px');
  });

  it('hides with no pieces, on /cotizacion and on a product page', () => {
    useQuote.setState({ lines: [] });
    const { rerender } = render(<QuoteBar />);
    expect(screen.queryByRole('region')).toBeNull();
    useQuote.setState({ lines: [line(1, 1)] });
    for (const pathname of ['/cotizacion', '/producto/uniforme']) {
      nav.pathname = pathname;
      rerender(<QuoteBar />);
      expect(screen.queryByRole('region')).toBeNull();
    }
  });
});
