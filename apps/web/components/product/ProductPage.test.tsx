import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCatalog, buildSettings, type RawBuildRows, validateBuildRows } from '@pyp/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { buildProductPage } from '@/lib/product';
import { ProductGallery } from './ProductGallery';
import { ProductPage } from './ProductPage';

const snapshot = JSON.parse(
  readFileSync(resolve(__dirname, '../../fixtures/build-data.json'), 'utf8'),
) as { views: RawBuildRows };
const rows = validateBuildRows(snapshot.views);
const catalog = buildCatalog(rows, '2026-10-12T00:00:00.000Z');
const settings = buildSettings(rows, '2026-10-12T00:00:00.000Z');
const page = (slug: string) => buildProductPage(rows, catalog, settings, slug, null)!;

describe('ProductPage', () => {
  it('shows the product, its options, specs, sports and related products', () => {
    const { container } = render(<ProductPage data={page('uniforme-basquetbol-completo')} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Uniforme de Básquetbol Completo' }),
    ).toBeVisible();
    expect(screen.getByText('SKU UNI-003')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Cantidad por talla' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Equipo de 12' })).toBeInTheDocument();
    expect(screen.getByText('Técnicas')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Básquetbol' })).toHaveAttribute(
      'href',
      '/deporte/basquetbol',
    );
    expect(screen.getByRole('heading', { name: 'Completa el uniforme' })).toBeVisible();
    expect(screen.getByText('Foto próximamente')).toBeVisible();
    const jsonLd = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}',
    );
    expect(jsonLd['@type']).toBe('Product');
    expect(jsonLd).not.toHaveProperty('offers');
  });

  it('asks about the product on WhatsApp', () => {
    render(<ProductPage data={page('balon-soccer-cruzeiro')} />);
    expect(screen.getByRole('link', { name: 'Preguntar por este producto' })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('*Balón Soccer Cruzeiro* (BAL-002)')),
    );
    expect(screen.getByRole('heading', { name: 'También te puede interesar' })).toBeVisible();
  });
});

describe('ProductGallery', () => {
  it('switches the main photo with the thumbnails', async () => {
    const user = userEvent.setup();
    render(
      <ProductGallery
        product={{ name: 'Balón', category: 'balones', image: null }}
        categoryName="Balones"
        images={[
          { keyBase: 'p/1/a', alt: 'Balón de frente', width: 800, height: 1000 },
          { keyBase: 'p/1/b', alt: 'Balón de lado', width: 800, height: 1000 },
        ]}
      />,
    );
    const thumbs = screen.getByRole('list', { name: 'Fotos' });
    await user.click(within(thumbs).getByRole('button', { name: 'Ver foto 2' }));
    expect(within(thumbs).getByRole('button', { name: 'Ver foto 2' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});
