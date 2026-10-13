import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCatalog, type RawBuildRows, validateBuildRows } from '@pyp/shared';
import { MIN_QUERY_LENGTH as SHARED_MIN } from '@pyp/shared/search';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchBox } from '@/components/layout/SearchBox';
import { resetCatalogCache } from '@/lib/catalog-client';
import { MIN_QUERY_LENGTH } from '@/lib/search-client';
import { SearchPage } from './SearchPage';

const nav = vi.hoisted(() => ({ search: '', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/buscar',
  useRouter: () => ({ push: nav.push, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

// The 56 test products of pyp-dev, as catalog.json carries them.
const snapshot = JSON.parse(
  readFileSync(resolve(__dirname, '../../fixtures/build-data.json'), 'utf8'),
) as { views: RawBuildRows };
const catalog = buildCatalog(validateBuildRows(snapshot.views), '2026-10-12T00:00:00.000Z');

beforeEach(() => {
  nav.search = '';
  nav.push.mockReset();
  resetCatalogCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(catalog))),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('SearchBox', () => {
  it('suggests products and categories while typing, and opens the highlighted one', async () => {
    const user = userEvent.setup();
    render(<SearchBox variant="desktop" />);
    const field = screen.getByRole('combobox', { name: 'Busca en el catálogo' });
    await user.type(field, 'balo');
    const list = await screen.findByRole('listbox', { name: 'Sugerencias' });
    await waitFor(() => expect(field).toHaveAttribute('aria-expanded', 'true'));
    const options = within(list).getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
    expect(options.length).toBeLessThanOrEqual(9);
    expect(within(list).getAllByText('Categoría').length).toBeLessThanOrEqual(3);

    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(nav.push).toHaveBeenCalledWith(expect.stringMatching(/^\/producto\//));
  });

  it('opens /buscar?q= with Enter, and Escape closes the list', async () => {
    const user = userEvent.setup();
    render(<SearchBox variant="desktop" />);
    const field = screen.getByRole('combobox');
    await user.type(field, 'balón');
    await waitFor(() => expect(field).toHaveAttribute('aria-expanded', 'true'));
    await user.keyboard('{Escape}');
    expect(field).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{Enter}');
    expect(nav.push).toHaveBeenCalledWith('/buscar?q=bal%C3%B3n');
  });

  it('shows nothing under 2 characters', async () => {
    const user = userEvent.setup();
    render(<SearchBox variant="mobile" />);
    await user.type(screen.getByRole('combobox'), 'b');
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    expect(MIN_QUERY_LENGTH).toBe(SHARED_MIN);
  });
});

const props = {
  sports: [{ href: '/deporte/futbol', label: 'Fútbol' }],
  categories: [{ href: '/catalogo/balones', label: 'Balones' }],
  whatsappNumber: '5500000000',
};

describe('SearchPage', () => {
  it('finds "Fútbol" when searching "futbol"', async () => {
    nav.search = '?q=futbol';
    render(<SearchPage {...props} />);
    const cards = await screen.findAllByRole('article');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Resultados para “futbol”' }),
    ).toBeVisible();
    expect(cards.some((card) => card.textContent?.includes('Fútbol'))).toBe(true);
    // Mobile sheet and desktop menu both offer the order, Relevancia by default.
    expect(screen.getAllByRole('button', { name: /Relevancia/ })).toHaveLength(2);
  });

  it('suggests "balón" for "valon"', async () => {
    nav.search = '?q=valon';
    render(<SearchPage {...props} />);
    const link = await screen.findByRole('link', { name: 'balón' });
    expect(link).toHaveAttribute('href', '/buscar?q=bal%C3%B3n');
    expect(link.closest('p')).toHaveTextContent('¿Quisiste decir balón?');
  });

  it('offers sports, categories and WhatsApp when nothing is found', async () => {
    nav.search = '?q=patineta';
    render(<SearchPage {...props} />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sin resultados para “patineta”' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Fútbol' })).toHaveAttribute('href', '/deporte/futbol');
    expect(screen.getByRole('link', { name: 'Balones' })).toHaveAttribute(
      'href',
      '/catalogo/balones',
    );
    expect(screen.getByRole('link', { name: 'Pregunta por WhatsApp' })).toHaveAttribute(
      'href',
      `https://wa.me/525500000000?text=${encodeURIComponent('Hola, busco "patineta" y no lo encontré en el catálogo.')}`,
    );
  });

  it('shows the sports without a query', () => {
    render(<SearchPage {...props} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Busca en el catálogo' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Fútbol' })).toBeVisible();
  });
});
