import type { CatalogProduct } from '@pyp/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MEDIA_URL } from '@/lib/images/loader';
import { CategoryTiles, ProductCard, ProductGrid, SportTiles, VolumeNote } from '.';

const variant = (n: number, o1: string | null, o2: string | null = null) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  sku: `SKU-${n}`,
  o1,
  o2,
});

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    sku: 'UNI-001',
    slug: 'uniforme-futbol',
    name: 'Uniforme de Fútbol Completo',
    brand: { slug: 'pyp', name: 'P&P' },
    category: 'uniformes',
    subcategory: null,
    sports: ['futbol'],
    audience: 'unisex',
    customizable: true,
    featured: false,
    sortOrder: 0,
    publishedAt: '2026-10-11T00:00:00.000Z',
    image: null,
    option1Name: 'Talla',
    option2Name: null,
    variants: [variant(1, 'CH'), variant(2, 'M')],
    meta: '2 tallas · colores a elegir',
    ...overrides,
  };
}

const ball = product({
  id: '10000000-0000-4000-8000-000000000002',
  slug: 'balon-molten',
  name: 'Balón Fútbol Molten',
  category: 'balones',
  customizable: false,
  variants: [variant(3, '5', 'Blanco/Rojo')],
  meta: 'Tamaño 5 · Blanco/Rojo',
});

describe('ProductCard', () => {
  it('links the whole card to the product page and offers "Ver tallas" with choices', () => {
    render(<ProductCard product={product()} categoryName="Uniformes" isNew />);
    const article = screen.getByRole('article');
    const links = within(article).getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/producto/uniforme-futbol');
    expect(
      within(article).getByRole('heading', { name: 'Uniforme de Fútbol Completo' }),
    ).toBeVisible();
    expect(within(article).getByText('P&P')).toBeVisible();
    expect(within(article).getByText('2 tallas · colores a elegir')).toBeVisible();
    expect(within(article).getByText('Nuevo')).toBeVisible();
    expect(within(article).getByText('Personalizable')).toBeVisible();
    expect(
      within(article).getByRole('link', { name: 'Ver tallas de Uniforme de Fútbol Completo' }),
    ).toHaveAttribute('href', '/producto/uniforme-futbol');
  });

  it('uses the generic image of the category when there is no photo', () => {
    const { container } = render(<ProductCard product={product()} categoryName="Uniformes" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/img/placeholder/uniformes.webp');
    expect(img).toHaveAttribute('alt', '');
  });

  it('shows the photo from R2 with its alt text', () => {
    render(
      <ProductCard
        product={product({ image: { keyBase: 'p/abc/img1', alt: 'Uniforme rojo de frente' } })}
        categoryName="Uniformes"
      />,
    );
    // Vitest does not load next.config, so only the R2 URL is checked here; the width loader has
    // its own tests and the dev sheet shows it working inside Next.
    const img = screen.getByRole('img', { name: 'Uniforme rojo de frente' });
    expect(decodeURIComponent(img.getAttribute('src') ?? '')).toContain(`${MEDIA_URL}/p/abc/img1`);
  });

  it('draws the generic image in CSS for a category without a generated file', () => {
    const { container } = render(
      <ProductCard product={product({ category: 'nueva-categoria' })} categoryName="Nueva" />,
    );
    expect(container.querySelector('img[src^="/img/placeholder"]')).toBeNull();
    expect(screen.getByText('Nueva')).toBeInTheDocument();
  });

  it('offers "+ Cotizar" for a product without choices', async () => {
    const user = userEvent.setup();
    const onQuickAdd = vi.fn();
    const { rerender } = render(<ProductCard product={ball} categoryName="Balones" />);
    expect(screen.getByRole('link', { name: 'Cotizar Balón Fútbol Molten' })).toHaveAttribute(
      'href',
      '/producto/balon-molten',
    );
    expect(screen.queryByText('Personalizable')).not.toBeInTheDocument();

    rerender(<ProductCard product={ball} categoryName="Balones" onQuickAdd={onQuickAdd} />);
    await user.click(screen.getByRole('button', { name: 'Cotizar Balón Fútbol Molten' }));
    expect(onQuickAdd).toHaveBeenCalledWith(ball);
  });

  it('says how many pieces are already in the quote', () => {
    render(<ProductCard product={ball} categoryName="Balones" piecesInQuote={12} />);
    expect(screen.getByText('En tu cotización · 12 piezas')).toBeVisible();
  });
});

describe('ProductGrid', () => {
  const many = Array.from({ length: 7 }, (_, i) =>
    product({
      id: `20000000-0000-4000-8000-00000000000${i}`,
      slug: `p-${i}`,
      name: `Producto ${i}`,
    }),
  );

  it('places the volume note after 4 cards on mobile and 6 on desktop', () => {
    render(
      <ProductGrid
        products={many}
        categoryNames={{ uniformes: 'Uniformes' }}
        volumeNoteUrl="https://wa.me/525500000000"
        empty={null}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(9);
    expect(items[4]).toHaveClass('lg:hidden');
    expect(
      within(items[4] as HTMLElement).getByText('¿Compras para tu liga o escuela?'),
    ).toBeInTheDocument();
    expect(items[7]).toHaveClass('hidden', 'lg:block');
  });

  it('shows the empty state with no products', () => {
    render(<ProductGrid products={[]} categoryNames={{}} empty={<p>Sin productos todavía</p>} />);
    expect(screen.getByText('Sin productos todavía')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('Tiles', () => {
  it('links sports and categories without product counts', () => {
    render(
      <>
        <SportTiles sports={[{ href: '/deporte/futbol', label: 'Fútbol' }]} />
        <CategoryTiles categories={[{ href: '/catalogo/balones', label: 'Balones' }]} />
      </>,
    );
    expect(screen.getByRole('link', { name: 'Fútbol' })).toHaveAttribute('href', '/deporte/futbol');
    expect(screen.getByRole('link', { name: 'Balones' })).toHaveAttribute(
      'href',
      '/catalogo/balones',
    );
    expect(screen.queryByText(/\d+ productos/)).not.toBeInTheDocument();
  });
});

describe('VolumeNote', () => {
  it('invites to quote by volume and links to WhatsApp', () => {
    render(<VolumeNote whatsappUrl="https://wa.me/525500000000" />);
    expect(
      screen.getByText('Precio especial por volumen. Arma tu lista y te cotizamos por WhatsApp.'),
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Hablar con un asesor' });
    expect(link).toHaveAttribute('href', 'https://wa.me/525500000000');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
