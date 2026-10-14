import { type CatalogProduct, EMPTY_QUOTE } from '@pyp/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useQuote } from '@/lib/commerce';
import { VariantMatrix } from './VariantMatrix';

let n = 0;
const variant = (o1: string | null, o2: string | null = null) => ({
  id: `00000000-0000-4000-8000-${String((n += 1)).padStart(12, '0')}`,
  sku: `V-${n}`,
  o1,
  o2,
});

const base = (overrides: Partial<CatalogProduct>): CatalogProduct => ({
  id: '10000000-0000-4000-8000-000000000001',
  sku: 'UNI-001',
  slug: 'uniforme',
  name: 'Uniforme de fútbol',
  brand: { slug: 'pyp', name: 'P&P' },
  category: 'uniformes',
  subcategory: null,
  sports: ['futbol'],
  audience: 'unisex',
  customizable: true,
  featured: false,
  sortOrder: 0,
  publishedAt: '2026-10-01T00:00:00.000Z',
  image: null,
  option1Name: 'Talla',
  option2Name: null,
  variants: [],
  meta: '',
  ...overrides,
});

const uniform = base({ variants: ['10', '12', 'CH', 'M', 'G', 'XG'].map((s) => variant(s)) });
const ball = base({
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Balón',
  slug: 'balon',
  customizable: false,
  option1Name: 'Tamaño',
  option2Name: 'Color',
  variants: [variant('4', 'Rojo'), variant('5', 'Rojo'), variant('5', 'Azul')],
});

beforeEach(() => {
  window.localStorage.clear();
  useQuote.setState({ ...EMPTY_QUOTE, hydrated: true });
});

const field = (name: string) => screen.getByRole('textbox', { name });

describe('VariantMatrix', () => {
  it('asks for pieces until there are some, then offers "Agregar a mi cotización"', async () => {
    const user = userEvent.setup();
    render(<VariantMatrix product={uniform} categoryName="Uniformes" customizable />);
    expect(screen.getByRole('heading', { name: 'Cantidad por talla' })).toBeVisible();
    expect(screen.getByText('Indica cuántas piezas necesitas por talla')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Sumar una pieza, M' }));
    expect(field('Cantidad talla M')).toHaveValue('1');
    expect(screen.getByText('1 pieza')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Agregar a mi cotización' })).toBeVisible();
  });

  it('works with the keyboard: Tab between fields, ↑/↓ add or subtract, typing caps at 9 999', async () => {
    const user = userEvent.setup();
    render(<VariantMatrix product={uniform} categoryName="Uniformes" customizable />);
    await user.click(field('Cantidad talla CH'));
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowDown}');
    expect(field('Cantidad talla CH')).toHaveValue('2');
    await user.tab(); // the "−" of M is disabled at 0, so Tab goes from CH's "+" …
    await user.tab();
    expect(field('Cantidad talla M')).toHaveFocus();
    await user.keyboard('123456');
    expect(field('Cantidad talla M')).toHaveValue('9999');
    await user.clear(field('Cantidad talla M'));
    expect(field('Cantidad talla M')).toHaveValue('0');
  });

  it('fills a team with the shortcuts, as in the design', async () => {
    const user = userEvent.setup();
    render(<VariantMatrix product={uniform} categoryName="Uniformes" customizable />);
    await user.click(screen.getByRole('button', { name: 'Equipo de 12' }));
    expect(
      ['CH', 'M', 'G', 'XG'].map((s) => (field(`Cantidad talla ${s}`) as HTMLInputElement).value),
    ).toEqual(['2', '4', '4', '2']);
    expect(field('Cantidad talla 10')).toHaveValue('0');
    expect(screen.getByRole('button', { name: 'Equipo de 12' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('12 piezas')).toBeVisible();
  });

  it('adds one line per variant with pieces, with the personalization, and starts over at 0', async () => {
    const user = userEvent.setup();
    render(<VariantMatrix product={uniform} categoryName="Uniformes" customizable />);
    await user.type(field('Cantidad talla CH'), '5');
    await user.type(field('Cantidad talla G'), '7');
    await user.click(screen.getByRole('checkbox', { name: 'Quiero personalizarlo' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Detalles de personalización' }),
      'Escudo y números',
    );
    await user.click(screen.getByRole('button', { name: 'Agregar a mi cotización' }));

    const lines = useQuote.getState().lines;
    expect(lines.map((l) => [l.snapshot.variantLabel, l.quantity, l.personalize, l.notes])).toEqual(
      [
        ['CH', 5, true, 'Escudo y números'],
        ['G', 7, true, 'Escudo y números'],
      ],
    );
    expect(screen.getByRole('status')).toHaveTextContent('Agregado a tu cotización: 12 piezas.');
    expect(field('Cantidad talla CH')).toHaveValue('0');
  });

  it('shows the simple page without shortcuts or personalization, with a color selector', async () => {
    const user = userEvent.setup();
    render(<VariantMatrix product={ball} categoryName="Balones" customizable={false} />);
    expect(screen.getByRole('heading', { name: 'Cantidad por tamaño' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Equipo de/ })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();

    const colors = screen.getByRole('radiogroup', { name: 'Color' });
    await user.type(field('Cantidad tamaño 5'), '3');
    await user.click(within(colors).getByRole('radio', { name: 'Azul' }));
    expect(screen.queryByRole('textbox', { name: 'Cantidad tamaño 4' })).toBeNull();
    await user.type(field('Cantidad tamaño 5'), '2');
    expect(within(colors).getByRole('radio', { name: 'Rojo (3)' })).toBeInTheDocument();
    expect(screen.getByText('Rojo: 3 · Azul: 2')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Agregar a mi cotización' }));
    expect(useQuote.getState().lines.map((l) => [l.snapshot.variantLabel, l.quantity])).toEqual([
      ['5 · Rojo', 3],
      ['5 · Azul', 2],
    ]);
  });
});
