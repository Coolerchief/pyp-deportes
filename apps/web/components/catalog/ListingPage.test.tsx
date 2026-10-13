import { type CatalogJson, type CatalogProduct, EMPTY_FILTERS, facetCounts } from '@pyp/shared';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetCatalogCache } from '@/lib/catalog-client';
import { serializeCounts } from '@/lib/facets';
import { ListingPage } from './ListingPage';

// The URL is the state: tests drive it through this fake useSearchParams, and replaceState
// (what the component calls) updates it, as Next does in the browser.
const url = vi.hoisted(() => ({ search: '', listeners: new Set<() => void>() }));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    usePathname: () => '/deporte/futbol',
    useSearchParams: () => {
      const search = useSyncExternalStore(
        (listener) => {
          url.listeners.add(listener);
          return () => url.listeners.delete(listener);
        },
        () => url.search,
      );
      return new URLSearchParams(search);
    },
  };
});

function setSearch(search: string) {
  url.search = search;
  act(() => url.listeners.forEach((listener) => listener()));
}

const product = (n: number, overrides: Partial<CatalogProduct> = {}): CatalogProduct => {
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  return {
    id,
    sku: `SKU-${n}`,
    slug: `producto-${n}`,
    name: `Producto ${String(n).padStart(2, '0')}`,
    brand: { slug: 'pyp', name: 'P&P' },
    category: 'balones',
    subcategory: null,
    sports: ['futbol'],
    audience: 'unisex',
    customizable: false,
    featured: false,
    sortOrder: n,
    publishedAt: '2026-10-01T00:00:00.000Z',
    image: null,
    option1Name: 'Talla',
    option2Name: null,
    variants: [{ id, sku: `SKU-${n}`, o1: null, o2: null }],
    meta: '',
    ...overrides,
  };
};

// 30 products: 1–4 are Molten uniforms for kids and customizable, the rest P&P balls; the last
// one is named so that it comes first only when sorting by name.
const products = Array.from({ length: 30 }, (_, i) =>
  i < 4
    ? product(i + 1, {
        category: 'uniformes',
        brand: { slug: 'molten', name: 'Molten' },
        audience: 'infantil',
        customizable: true,
      })
    : product(i + 1, i === 29 ? { name: 'Aro de entrenamiento' } : {}),
);

const catalog: CatalogJson = {
  generatedAt: '2026-10-12T00:00:00.000Z',
  products,
  sports: [{ slug: 'futbol', name: 'Fútbol' }],
  categories: [
    { slug: 'uniformes', name: 'Uniformes', parent: null },
    { slug: 'balones', name: 'Balones', parent: null },
  ],
  brands: [
    { slug: 'molten', name: 'Molten' },
    { slug: 'pyp', name: 'P&P' },
  ],
};

const props = {
  scope: { kind: 'sport', sport: 'futbol' } as const,
  basePath: '/deporte/futbol',
  breadcrumbs: [{ label: 'Inicio', href: '/' }, { label: 'Deportes' }, { label: 'Fútbol' }],
  title: 'Fútbol',
  products,
  chips: [],
  tabs: [
    { label: 'Todo', category: null },
    { label: 'Uniformes', category: 'uniformes' },
    { label: 'Balones', category: 'balones' },
  ],
  shortcuts: [{ label: 'Balones de fútbol', href: '/catalogo/balones/balones-futbol' }],
  categoryNames: { balones: 'Balones', uniformes: 'Uniformes' },
  labels: {
    deporte: { futbol: 'Fútbol' },
    categoria: { balones: 'Balones', uniformes: 'Uniformes' },
    marca: { molten: 'Molten', pyp: 'P&P' },
  },
  scopeCounts: serializeCounts(facetCounts(products, EMPTY_FILTERS)),
  newIds: [],
  whatsappUrl: 'https://wa.me/525500000000',
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  url.search = '';
  resetCatalogCache();
  fetchMock = vi.fn(async () => new Response(JSON.stringify(catalog)));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(window.history, 'replaceState').mockImplementation((_state, _title, next) => {
    setSearch(new URL(String(next), 'http://localhost').search);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const desktopPanel = () => screen.getByRole('complementary', { name: 'Filtros' });

describe('ListingPage', () => {
  it('renders the first 24 products without downloading catalog.json', () => {
    render(<ListingPage {...props} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fútbol' })).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(24);
    expect(screen.getAllByText('Mostrando 24 de 30').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Balones de fútbol' })).toHaveAttribute(
      'href',
      '/catalogo/balones/balones-futbol',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filters from the panel, writes the URL and shows the active chips', async () => {
    const user = userEvent.setup();
    render(<ListingPage {...props} />);
    await user.click(within(desktopPanel()).getByRole('checkbox', { name: /Molten/ }));
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      '/deporte/futbol?marca=molten',
    );
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(4));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const active = screen.getByRole('list', { name: 'Filtros activos' });
    await user.click(within(active).getByRole('button', { name: 'Molten' }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(24));
  });

  it('reproduces a shared URL and offers "Limpiar filtros" when nothing matches', async () => {
    const user = userEvent.setup();
    url.search = '?marca=molten&para=adulto';
    render(<ListingPage {...props} />);
    expect(await screen.findByText('Ningún producto con estos filtros')).toBeVisible();
    expect(screen.getByText('Quita alguno o límpialos para ver todo lo de Fútbol.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(24));
    expect(url.search).toBe('');
  });

  it('sorts by name and loads 24 more', async () => {
    const user = userEvent.setup();
    url.search = '?orden=nombre';
    render(<ListingPage {...props} />);
    // The default order starts with "Producto 01" (sortOrder 1); by name, with "Aro…".
    await waitFor(() =>
      expect(within(screen.getAllByRole('article')[0]!).getByRole('heading')).toHaveTextContent(
        'Aro de entrenamiento',
      ),
    );
    expect(screen.getAllByRole('article')).toHaveLength(24);
    await user.click(screen.getByRole('button', { name: 'Cargar más' }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(30));
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
  });

  it('switches category with the chips of a sport page', async () => {
    const user = userEvent.setup();
    render(<ListingPage {...props} />);
    const chips = screen.getByRole('navigation', { name: 'Categorías del listado' });
    await user.click(within(chips).getByRole('button', { name: 'Uniformes' }));
    expect(url.search).toBe('?categoria=uniformes');
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(4));
    expect(within(chips).getByRole('button', { name: 'Uniformes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('applies the mobile sheet only on "Ver n productos"', async () => {
    const user = userEvent.setup();
    render(<ListingPage {...props} />);
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filtrar' });
    await user.click(within(sheet).getByRole('checkbox', { name: /Solo personalizables/ }));
    expect(url.search).toBe('');
    await user.click(await within(sheet).findByRole('button', { name: 'Ver 4 productos' }));
    expect(url.search).toBe('?personalizable=1');
    expect(screen.getByRole('button', { name: 'Filtrar (1)' })).toBeVisible();
  });

  it('keeps the static listing and offers to retry when catalog.json fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    url.search = '?marca=molten';
    render(<ListingPage {...props} />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar todos los productos');
    expect(screen.getAllByRole('article')).toHaveLength(24);
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(4));
  });

  it('sends to WhatsApp when there are no products yet', () => {
    render(<ListingPage {...props} products={[]} tabs={[]} shortcuts={[]} />);
    expect(screen.getByText('Pronto verás aquí nuestros productos')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Pregunta por WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/525500000000',
    );
  });
});
