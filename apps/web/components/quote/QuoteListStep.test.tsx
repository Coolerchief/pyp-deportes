import { type CatalogJson, EMPTY_QUOTE, type QuoteLine } from '@pyp/shared';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetCatalogCache } from '@/lib/catalog-client';
import { useQuote } from '@/lib/commerce';
import { QuoteListStep } from './QuoteListStep';
import { UNDO_MS } from './UndoNotice';

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/cotizacion',
}));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const UNIFORM = uuid(1);
const BALL = uuid(2);
const GONE = uuid(3);

const line = (
  n: number,
  productId: string,
  name: string,
  label: string | null,
  quantity: number,
  extra: Partial<QuoteLine> = {},
): QuoteLine => ({
  lineId: `l${n}`,
  productId,
  variantId: uuid(100 + n),
  quantity,
  personalize: false,
  notes: '',
  snapshot: { name, sku: `SKU-${n}`, slug: `p-${n}`, variantLabel: label, image: null },
  addedAt: '2026-10-13T00:00:00.000Z',
  ...extra,
});

const product = (id: string, name: string, customizable: boolean) => ({
  id,
  sku: name,
  slug: name.toLowerCase(),
  name,
  brand: { slug: 'pyp', name: 'P&P' },
  category: 'uniformes',
  subcategory: null,
  sports: [],
  audience: 'unisex' as const,
  customizable,
  featured: false,
  sortOrder: 0,
  publishedAt: '2026-10-01T00:00:00.000Z',
  image: null,
  option1Name: 'Talla',
  option2Name: null,
  variants: [{ id: uuid(900), sku: 'X', o1: null, o2: null }],
  meta: '',
});

const catalog: CatalogJson = {
  generatedAt: '2026-10-12T00:00:00.000Z',
  products: [product(UNIFORM, 'Uniforme', true), product(BALL, 'Balón', false)],
  sports: [],
  categories: [{ slug: 'uniformes', name: 'Uniformes', parent: null }],
  brands: [],
};

const sports = [{ href: '/deporte/futbol', label: 'Fútbol' }];
const uniformLines = [
  line(1, UNIFORM, 'Uniforme', 'CH', 3, { personalize: true, notes: 'Escudo al pecho' }),
  line(2, UNIFORM, 'Uniforme', 'M', 6, { personalize: true, notes: 'Escudo al pecho' }),
];
const setList = (lines: QuoteLine[], extra = {}) =>
  useQuote.setState({ ...EMPTY_QUOTE, lines, hydrated: true, storageAvailable: true, ...extra });

beforeEach(() => {
  window.localStorage.clear();
  resetCatalogCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(catalog))),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('QuoteListStep', () => {
  it('waits for the saved list before showing anything', () => {
    useQuote.setState({ ...EMPTY_QUOTE, hydrated: false });
    const { container } = render(<QuoteListStep sports={sports} onContinue={() => {}} />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Tu lista está vacía')).toBeNull();
  });

  it('offers the catalog and the sports when the list is empty', () => {
    setList([]);
    render(<QuoteListStep sports={sports} onContinue={() => {}} />);
    expect(screen.getByText('Tu lista está vacía')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver catálogo' })).toHaveAttribute('href', '/catalogo');
    expect(screen.getByRole('link', { name: 'Fútbol' })).toHaveAttribute('href', '/deporte/futbol');
  });

  it('groups the lines by product with their pieces, breakdown and total', () => {
    setList([...uniformLines, line(3, BALL, 'Balón', '#5', 12)]);
    const onContinue = vi.fn();
    render(<QuoteListStep sports={sports} onContinue={onContinue} />);
    expect(screen.getByText('2 productos · 21 piezas')).toBeVisible();
    const uniform = screen.getByRole('article', { name: 'Uniforme' });
    expect(within(uniform).getByText('9 piezas')).toBeVisible();
    expect(within(uniform).getByRole('list', { name: 'Piezas por variante' })).toHaveTextContent(
      'CH× 3M× 6',
    );
    expect(within(uniform).getByText(/Escudo al pecho/)).toBeVisible();
    expect(screen.getByText('21 piezas', { selector: '.type-number' })).toBeVisible();
    screen.getByRole('button', { name: 'Continuar' }).click();
    expect(onContinue).toHaveBeenCalled();
  });

  it('edits quantities per variant', async () => {
    const user = userEvent.setup();
    setList(uniformLines);
    render(<QuoteListStep sports={sports} onContinue={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Editar cantidades' }));
    await user.click(screen.getByRole('button', { name: 'Sumar una pieza, CH' }));
    const field = screen.getByRole('textbox', { name: 'Cantidad CH, Uniforme' });
    await user.clear(field);
    expect(field).toHaveValue('1');
    await user.type(field, '0');
    expect(useQuote.getState().lines[0]?.quantity).toBe(10);
    await user.click(screen.getByRole('button', { name: 'Listo' }));
    expect(screen.getByText('1 producto · 16 piezas')).toBeVisible();
  });

  it('removes a product and puts it back with "Deshacer"; the notice goes after 5 s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setList([...uniformLines, line(3, BALL, 'Balón', '#5', 12)]);
    render(<QuoteListStep sports={sports} onContinue={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Quitar Uniforme' }));
    expect(screen.queryByRole('article', { name: 'Uniforme' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Quitaste Uniforme');
    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(screen.getByRole('article', { name: 'Uniforme' })).toBeVisible();
    expect(useQuote.getState().lines.map((l) => l.lineId)).toEqual(['l1', 'l2', 'l3']);

    await user.click(screen.getByRole('button', { name: 'Quitar Balón' }));
    act(() => vi.advanceTimersByTime(UNDO_MS + 10));
    expect(screen.queryByRole('button', { name: 'Deshacer' })).toBeNull();
  });

  it('edits the personalization of the product, or removes it', async () => {
    const user = userEvent.setup();
    setList(uniformLines);
    render(<QuoteListStep sports={sports} onContinue={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Editar personalización de Uniforme' }));
    const dialog = screen.getByRole('dialog', { name: 'Personalización' });
    const text = within(dialog).getByRole('textbox', { name: '¿Cómo lo quieres?' });
    expect(within(dialog).getByText('15 / 500')).toBeVisible();
    await user.clear(text);
    await user.type(text, 'Nombres y números');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(useQuote.getState().lines.every((l) => l.notes === 'Nombres y números')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Editar personalización de Uniforme' }));
    await user.click(screen.getByRole('button', { name: 'Quitar personalización' }));
    expect(useQuote.getState().lines.every((l) => !l.personalize && l.notes === '')).toBe(true);
    // Customizable product without personalization: it can be added again.
    expect(await screen.findByRole('button', { name: '+ Agregar personalización' })).toBeVisible();
  });

  it('marks products no longer published and blocks "Continuar" until they are removed', async () => {
    const user = userEvent.setup();
    setList([line(1, GONE, 'Agotado', 'M', 2), line(2, BALL, 'Balón', '#5', 1)]);
    render(<QuoteListStep sports={sports} onContinue={() => {}} />);
    const gone = screen.getByRole('article', { name: 'Agotado' });
    expect(await within(gone).findByText(/No disponible/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Quitar Agotado' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled());
  });

  it('warns when the browser does not keep the list', () => {
    setList(uniformLines, { storageAvailable: false });
    render(<QuoteListStep sports={sports} onContinue={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tu lista no se guardará si cierras esta página.',
    );
  });
});
