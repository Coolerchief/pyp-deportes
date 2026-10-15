import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EMPTY_PRODUCT_FORM } from '@pyp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorProduct } from '@/lib/admin/products';
import { CommerceSection } from './CommerceSection';
import { VariantsSection } from './VariantsSection';

// T4.4: the variant generator with admin_save_variants stubbed.

vi.mock('@/lib/supabase/browser', () => ({ getSupabase: () => ({}) }));
const data = vi.hoisted(() => ({
  saveVariants: vi.fn(),
  fetchProduct: vi.fn(),
  saveCommerce: vi.fn(),
}));
vi.mock('@/lib/admin/products', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/admin/products')>()),
  ...data,
}));

const variant = (id: string, option1: string | null, option2: string | null = null) => ({
  id,
  sku: ['UNI-001', option1, option2].filter(Boolean).join('-').toUpperCase(),
  option1,
  option2,
  isDefault: !option1 && !option2,
  prices: [],
  stock: [],
});

const PRODUCT: EditorProduct = {
  id: '0b6f0b6f-0000-4000-8000-000000000001',
  status: 'published',
  publishedAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
  option1Name: 'Talla',
  option2Name: null,
  colorNote: 'A elegir',
  photoCount: 0,
  images: [],
  variants: [variant('v1', 'CH'), variant('v2', 'M'), variant('v3', 'G')],
  allVariants: [
    { id: 'v0', option1: null, option2: null, isActive: false },
    { id: 'v1', option1: 'CH', option2: null, isActive: true },
    { id: 'v2', option1: 'M', option2: null, isActive: true },
    { id: 'v3', option1: 'G', option2: null, isActive: true },
    { id: 'v4', option1: 'XG', option2: null, isActive: false },
  ],
  form: { ...EMPTY_PRODUCT_FORM, name: 'Uniforme', sku: 'UNI-001', slug: 'uniforme' },
};

const preview = () => screen.getByRole('region', { name: 'Vista previa de variantes' });
const rows = () =>
  within(preview())
    .getAllByRole('listitem')
    .map((item) => item.textContent);

beforeEach(() => {
  for (const fn of Object.values(data)) fn.mockReset();
});

describe('VariantsSection', () => {
  it('starts from the current sizes and cannot regenerate without changes', () => {
    render(<VariantsSection product={PRODUCT} onSaved={vi.fn()} />);
    expect(screen.getByLabelText(/^Valores de Talla/)).toHaveValue('CH, M, G');
    expect(screen.getByLabelText(/^Nota de color/)).toHaveValue('A elegir');
    expect(rows()).toEqual([
      'CHUNI-001-CHSe conserva',
      'MUNI-001-MSe conserva',
      'GUNI-001-GSe conserva',
    ]);
    expect(screen.getByRole('button', { name: 'Generar variantes' })).toBeDisabled();
  });

  it('previews new, kept, reactivated and deactivated variants', async () => {
    const user = userEvent.setup();
    render(<VariantsSection product={PRODUCT} onSaved={vi.fn()} />);
    const values = screen.getByLabelText(/^Valores de Talla/);
    await user.clear(values);
    await user.type(values, 'M, G, XG, XXG');
    expect(rows()).toEqual([
      'MUNI-001-MSe conserva',
      'GUNI-001-GSe conserva',
      'XGUNI-001-XGSe reactiva',
      'XXGUNI-001-XXGNueva',
      'CHSe desactiva',
    ]);
    expect(within(preview()).getByText('4 variantes · 1 se desactiva')).toBeVisible();
  });

  it('crosses sizes and colors', async () => {
    const user = userEvent.setup();
    render(<VariantsSection product={PRODUCT} onSaved={vi.fn()} />);
    await user.click(screen.getByLabelText(/Tiene colores/));
    expect(screen.queryByLabelText(/^Nota de color/)).toBeNull();
    await user.type(screen.getByLabelText(/^Valores de Color/), 'Rojo, Azul');
    expect(within(preview()).getByText('6 variantes · 3 se desactivan')).toBeVisible();
    expect(rows()[0]).toBe('CH · RojoUNI-001-CH-ROJONueva');
  });

  it('fills sizes from a preset', async () => {
    const user = userEvent.setup();
    render(<VariantsSection product={PRODUCT} onSaved={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Rellenar con Infantil/ }));
    expect(screen.getByLabelText(/^Valores de Talla/)).toHaveValue('6, 8, 10, 12, 14');
  });

  it('explains what is missing before generating', async () => {
    const user = userEvent.setup();
    render(<VariantsSection product={PRODUCT} onSaved={vi.fn()} />);
    await user.click(screen.getByLabelText(/Tiene colores/));
    await user.click(screen.getByRole('button', { name: 'Generar variantes' }));
    expect(screen.getByLabelText(/^Valores de Color/)).toHaveAccessibleDescription(
      'Escribe al menos un color o quita "Tiene colores".',
    );
    expect(data.saveVariants).not.toHaveBeenCalled();
  });

  it('generates and reports what changed', async () => {
    const fresh = { ...PRODUCT, variants: [variant('v2', 'M'), variant('v5', 'XXG')] };
    data.saveVariants.mockResolvedValue({ created: 1, kept: 1, deactivated: 2 });
    data.fetchProduct.mockResolvedValue(fresh);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<VariantsSection product={PRODUCT} onSaved={onSaved} />);
    const values = screen.getByLabelText(/^Valores de Talla/);
    await user.clear(values);
    await user.type(values, 'M, XXG');
    await user.click(screen.getByRole('button', { name: 'Generar variantes' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Variantes listas: 1 nueva, 1 se conserva y 2 desactivadas.',
    );
    expect(data.saveVariants).toHaveBeenCalledWith(
      {},
      {
        product_id: PRODUCT.id,
        option1_name: 'Talla',
        option2_name: '',
        color_note: 'A elegir',
        option1: ['M', 'XXG'],
        option2: [],
      },
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(fresh));
  });

  it('shows a database error', async () => {
    data.saveVariants.mockRejectedValue({
      code: '22023',
      message: 'Son demasiadas combinaciones: el máximo es 200 variantes.',
    });
    const user = userEvent.setup();
    render(<VariantsSection product={PRODUCT} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText(/^Valores de Talla/), ', XG');
    await user.click(screen.getByRole('button', { name: 'Generar variantes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Son demasiadas combinaciones');
  });
});

describe('CommerceSection · same price for every variant', () => {
  it('fills the price from 1 piece and keeps the volume tiers', async () => {
    data.saveCommerce.mockResolvedValue(undefined);
    data.fetchProduct.mockResolvedValue(null);
    const product: EditorProduct = {
      ...PRODUCT,
      variants: [
        { ...variant('v1', 'CH'), prices: [{ minQty: 12, unitPriceCents: 30000 }] },
        variant('v2', 'M'),
      ],
    };
    const user = userEvent.setup();
    render(<CommerceSection product={product} stores={[{ id: 't1', name: 'Coapa' }]} />);
    const all = screen.getByLabelText(/Precio por pieza para todas/);
    await user.type(all, 'abc');
    await user.click(screen.getByRole('button', { name: 'Aplicar a todas' }));
    expect(all).toHaveAccessibleDescription('Escribe un importe, por ejemplo 450.00.');
    await user.clear(all);
    await user.type(all, '450{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Precio de $450.00 aplicado a 2 variantes. Falta guardar.',
    );
    await user.click(screen.getByRole('button', { name: 'Guardar datos comerciales' }));
    await waitFor(() => expect(data.saveCommerce).toHaveBeenCalled());
    expect(data.saveCommerce.mock.calls[0]![2]).toEqual([
      {
        variantId: 'v1',
        prices: [
          { minQty: 1, unitPriceCents: 45000 },
          { minQty: 12, unitPriceCents: 30000 },
        ],
        stock: [],
      },
      { variantId: 'v2', prices: [{ minQty: 1, unitPriceCents: 45000 }], stock: [] },
    ]);
  });
});
