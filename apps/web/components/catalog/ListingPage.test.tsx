import type { CatalogProduct } from '@pyp/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListingPage } from './ListingPage';

const product = (n: number): CatalogProduct => {
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  return {
    id,
    sku: `SKU-${n}`,
    slug: `producto-${n}`,
    name: `Producto ${n}`,
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
  };
};

const props = {
  breadcrumbs: [{ label: 'Inicio', href: '/' }, { label: 'Deportes' }, { label: 'Fútbol' }],
  title: 'Fútbol',
  chips: [
    { label: 'Todo', href: '/deporte/futbol', active: true },
    { label: 'Balones', href: '/deporte/futbol?categoria=balones', active: false },
  ],
  shortcuts: [{ label: 'Balones de fútbol', href: '/catalogo/balones/balones-futbol' }],
  categoryNames: { balones: 'Balones' },
  newIds: new Set<string>(),
  whatsappUrl: 'https://wa.me/525500000000',
};

describe('ListingPage', () => {
  it('renders the first 24 products, the count and "Mostrando 24 de n"', () => {
    const products = Array.from({ length: 30 }, (_, i) => product(i + 1));
    render(<ListingPage {...props} products={products} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fútbol' })).toBeVisible();
    expect(screen.getByText('30 productos')).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(24);
    expect(screen.getByText('Mostrando 24 de 30')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Balones de fútbol' })).toHaveAttribute(
      'href',
      '/catalogo/balones/balones-futbol',
    );
    const chips = screen.getByRole('navigation', { name: 'Categorías del listado' });
    expect(within(chips).getByRole('link', { name: 'Todo' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('marks the current page in the breadcrumb', () => {
    render(<ListingPage {...props} products={[product(1)]} />);
    const trail = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(trail).getByText('Fútbol')).toHaveAttribute('aria-current', 'page');
    expect(within(trail).getAllByRole('link', { name: 'Inicio' })[0]).toHaveAttribute('href', '/');
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
  });

  it('sends to WhatsApp when there are no products yet', () => {
    render(<ListingPage {...props} products={[]} chips={[props.chips[0]!]} shortcuts={[]} />);
    expect(screen.getByText('Pronto verás aquí nuestros productos')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Pregunta por WhatsApp' })).toHaveAttribute(
      'href',
      'https://wa.me/525500000000',
    );
    expect(screen.queryByRole('navigation', { name: 'Categorías del listado' })).toBeNull();
  });
});
