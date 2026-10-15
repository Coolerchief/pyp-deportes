import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EMPTY_PRODUCT_FORM } from '@pyp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorProduct, ProductRow, Taxonomy } from '@/lib/admin/products';
import { ProductEditorPage } from './ProductEditor';
import { ProductsPage } from './ProductsPage';

// T4.3: list and editor with the data layer stubbed (lib/admin/products is tested on its own).

const nav = vi.hoisted(() => ({
  search: '',
  replace: vi.fn(),
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/admin/productos',
}));
vi.mock('@/lib/supabase/browser', () => ({ getSupabase: () => ({}) }));

const data = vi.hoisted(() => ({
  listProducts: vi.fn(),
  fetchTaxonomy: vi.fn(),
  fetchProduct: vi.fn(),
  saveProduct: vi.fn(),
  duplicateProduct: vi.fn(),
  saveCommerce: vi.fn(),
}));
vi.mock('@/lib/admin/products', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/admin/products')>()),
  ...data,
}));

const TAXONOMY: Taxonomy = {
  categories: [
    { id: 'c1', name: 'Balones', parentId: null, sizeLabel: 'Tamaño' },
    { id: 'c1a', name: 'Fútbol', parentId: 'c1', sizeLabel: 'Talla' },
    { id: 'c2', name: 'Uniformes', parentId: null, sizeLabel: 'Talla' },
  ],
  brands: [{ id: 'b1', name: 'P&P' }],
  sports: [
    { id: 's1', name: 'Fútbol' },
    { id: 's2', name: 'Básquetbol' },
  ],
  stores: [{ id: 't1', name: 'Coapa' }],
};

const ROWS: ProductRow[] = [
  {
    id: 'p1',
    sku: 'BAL-001',
    name: 'Balón de Fútbol No. 5',
    status: 'published',
    categoryName: 'Balones',
    photo: null,
    updatedAt: '2026-10-14T16:03:00Z',
  },
  {
    id: 'p2',
    sku: 'UNI-001',
    name: 'Uniforme Completo',
    status: 'draft',
    categoryName: 'Uniformes',
    photo: 'p/p2/a',
    updatedAt: '2026-10-13T16:03:00Z',
  },
];

const PUBLISHED: EditorProduct = {
  id: '0b6f0b6f-0000-4000-8000-000000000001',
  status: 'published',
  publishedAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
  option1Name: 'Tamaño',
  option2Name: null,
  colorNote: null,
  photoCount: 0,
  variants: [
    {
      id: 'v1',
      sku: 'BAL-001',
      option1: null,
      option2: null,
      isDefault: true,
      prices: [],
      stock: [],
    },
  ],
  allVariants: [{ id: 'v1', option1: null, option2: null, isActive: true }],
  form: {
    ...EMPTY_PRODUCT_FORM,
    name: 'Balón de Fútbol No. 5',
    sku: 'BAL-001',
    slug: 'balon-de-futbol-no-5',
    brandId: 'b1',
    categoryId: 'c1',
    subcategoryId: 'c1a',
    sportIds: ['s1'],
  },
};

beforeEach(() => {
  nav.search = '';
  nav.replace.mockReset();
  nav.push.mockReset();
  for (const fn of Object.values(data)) fn.mockReset();
  data.fetchTaxonomy.mockResolvedValue(TAXONOMY);
  data.listProducts.mockResolvedValue({ rows: ROWS, total: 2 });
});

describe('ProductsPage', () => {
  it('lists products with status, "SIN FOTO" and a link to edit', async () => {
    render(<ProductsPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando productos…');
    const table = await screen.findByRole('table');
    expect(screen.getByText('2 productos')).toBeVisible();
    const row = within(table).getByRole('link', { name: 'Balón de Fútbol No. 5' }).closest('tr')!;
    expect(row).toHaveTextContent('BAL-001');
    expect(row).toHaveTextContent('Publicado');
    expect(row).toHaveTextContent('SIN FOTO');
    expect(within(table).getByRole('link', { name: 'Balón de Fútbol No. 5' })).toHaveAttribute(
      'href',
      '/admin/productos/editar?id=p1',
    );
    expect(within(table).getByRole('img', { name: 'Uniforme Completo' })).toHaveAttribute(
      'src',
      'https://media.pypdeportescoapa.com/p/p2/a-320.webp',
    );
    expect(screen.getByRole('link', { name: 'Nuevo producto' })).toHaveAttribute(
      'href',
      '/admin/productos/nuevo',
    );
  });

  it('keeps the filters in the URL', async () => {
    const user = userEvent.setup();
    render(<ProductsPage />);
    await screen.findByRole('table');
    await user.selectOptions(screen.getByLabelText('Estado'), 'Borrador');
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/productos?estado=draft');
    await user.type(screen.getByRole('searchbox'), 'balón{Enter}');
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/productos?q=bal%C3%B3n');
    await user.click(screen.getByLabelText('Solo sin foto'));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/productos?foto=sin');
    expect(screen.getByLabelText('Categoría')).toHaveTextContent('Uniformes');
  });

  it('offers to clear filters that match nothing', async () => {
    nav.search = 'estado=archived';
    data.listProducts.mockResolvedValue({ rows: [], total: 0 });
    render(<ProductsPage />);
    expect(await screen.findByText('Ningún producto con estos filtros')).toBeVisible();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/productos');
  });

  it('explains a failure and retries', async () => {
    data.listProducts.mockRejectedValueOnce(new Error('red'));
    render(<ProductsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los productos.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table')).toBeVisible();
  });
});

describe('ProductEditor · new product', () => {
  it('says what is missing and focuses the first field', async () => {
    const user = userEvent.setup();
    render(<ProductEditorPage mode="new" />);
    await user.click(await screen.findByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falta corregir 5 datos antes de guardar.',
    );
    await waitFor(() => expect(screen.getByLabelText(/^Nombre/)).toHaveFocus());
    expect(screen.getByLabelText(/^Nombre/)).toHaveAccessibleDescription('Escribe el nombre.');
    expect(screen.getByLabelText(/^Marca/)).toHaveAccessibleDescription('Elige la marca.');
    expect(data.saveProduct).not.toHaveBeenCalled();
  });

  async function fillNew() {
    const user = userEvent.setup();
    render(<ProductEditorPage mode="new" />);
    await user.type(await screen.findByLabelText(/^Nombre/), 'Balón de Fútbol No. 5');
    expect(screen.getByLabelText(/^Dirección/)).toHaveValue('balon-de-futbol-no-5');
    await user.type(screen.getByLabelText(/^SKU/), 'bal-009');
    await user.selectOptions(screen.getByLabelText(/^Categoría/), 'Balones');
    await user.selectOptions(screen.getByLabelText(/^Subcategoría/), 'Fútbol');
    // user-event compares with innerHTML ('P&amp;P'), so by value.
    await user.selectOptions(screen.getByLabelText(/^Marca/), 'b1');
    await user.click(screen.getByLabelText('Fútbol'));
    return user;
  }

  it('proposes the address from the name and saves a draft', async () => {
    data.saveProduct.mockResolvedValue('nuevo-id');
    const user = await fillNew();
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(data.saveProduct).toHaveBeenCalled());
    expect(data.saveProduct.mock.calls[0]![1]).toMatchObject({
      status: 'draft',
      sku: 'BAL-009',
      slug: 'balon-de-futbol-no-5',
      categoryId: 'c1',
      subcategoryId: 'c1a',
      brandId: 'b1',
      sportIds: ['s1'],
    });
    expect(data.saveProduct.mock.calls[0]![1]).not.toHaveProperty('id');
    expect(nav.replace).toHaveBeenCalledWith('/admin/productos/editar?id=nuevo-id&aviso=creado');
  });

  it('can publish at once', async () => {
    data.saveProduct.mockResolvedValue('nuevo-id');
    const user = await fillNew();
    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith(
        '/admin/productos/editar?id=nuevo-id&aviso=publicado',
      ),
    );
    expect(data.saveProduct.mock.calls[0]![1]).toMatchObject({ status: 'published' });
  });

  it('puts a repeated SKU on its field', async () => {
    data.saveProduct.mockRejectedValue({
      code: '23505',
      message: 'duplicate key value violates unique constraint "products_sku_key"',
    });
    const user = await fillNew();
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() =>
      expect(screen.getByLabelText(/^SKU/)).toHaveAccessibleDescription(
        'Ya existe un producto con ese SKU.',
      ),
    );
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('a subcategory of another category is cleared', async () => {
    const user = await fillNew();
    await user.selectOptions(screen.getByLabelText(/^Categoría/), 'Uniformes');
    expect(screen.getByLabelText(/^Subcategoría/)).toHaveValue('');
    expect(screen.getByLabelText(/^Subcategoría/)).toBeDisabled();
  });

  it('asks for a technique when it can be customized', async () => {
    const user = await fillNew();
    await user.click(screen.getByLabelText(/Se puede personalizar/));
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(
      await screen.findByText('Elige al menos una técnica o quita "Se puede personalizar".'),
    ).toBeVisible();
    await user.click(screen.getByLabelText('Bordado'));
    data.saveProduct.mockResolvedValue('nuevo-id');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(data.saveProduct).toHaveBeenCalled());
    expect(data.saveProduct.mock.calls[0]![1]).toMatchObject({
      isCustomizable: true,
      techniques: ['bordado'],
    });
  });
});

describe('ProductEditor · existing product', () => {
  beforeEach(() => {
    nav.search = `id=${PUBLISHED.id}`;
    data.fetchProduct.mockResolvedValue(PUBLISHED);
  });

  it('keeps the SKU and address of a published product', async () => {
    render(<ProductEditorPage mode="edit" />);
    expect(
      await screen.findByRole('heading', { name: 'Balón de Fútbol No. 5', level: 1 }),
    ).toBeVisible();
    expect(screen.getByLabelText(/^SKU/)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Dirección/)).toHaveAttribute('readonly');
    expect(screen.getByRole('link', { name: /Ver en el sitio/ })).toHaveAttribute(
      'href',
      '/producto/balon-de-futbol-no-5',
    );
    expect(screen.getByText('SIN FOTO')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();
  });

  it('archives and says when it leaves the site', async () => {
    data.saveProduct.mockResolvedValue(PUBLISHED.id);
    data.fetchProduct.mockResolvedValueOnce(PUBLISHED).mockResolvedValueOnce({
      ...PUBLISHED,
      status: 'archived',
    });
    const user = userEvent.setup();
    render(<ProductEditorPage mode="edit" />);
    await user.click(await screen.findByRole('button', { name: 'Archivar' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Archivado. Saldrá del sitio cuando publiques los cambios desde Inicio.',
    );
    expect(data.saveProduct.mock.calls[0]![1]).toMatchObject({
      id: PUBLISHED.id,
      status: 'archived',
    });
    expect(screen.getByRole('button', { name: 'Restaurar como borrador' })).toBeVisible();
  });

  it('shows the database reason when publishing is not allowed', async () => {
    data.saveProduct.mockRejectedValue({
      code: '23514',
      message: 'No se puede publicar BAL-001 : necesita al menos una variante activa.',
    });
    const user = userEvent.setup();
    render(<ProductEditorPage mode="edit" />);
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se puede publicar BAL-001: necesita al menos una variante activa.',
    );
  });

  it('duplicates into a draft copy', async () => {
    data.duplicateProduct.mockResolvedValue('copia-id');
    const user = userEvent.setup();
    render(<ProductEditorPage mode="edit" />);
    await user.click(await screen.findByRole('button', { name: 'Duplicar' }));
    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith('/admin/productos/editar?id=copia-id&aviso=copia'),
    );
  });

  it('asks to save before duplicating with unsaved changes', async () => {
    const user = userEvent.setup();
    render(<ProductEditorPage mode="edit" />);
    await user.type(await screen.findByLabelText(/^Descripción corta/), 'Nueva');
    expect(screen.getByText('Cambios sin guardar')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Duplicar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Guarda tus cambios antes de duplicar',
    );
    expect(data.duplicateProduct).not.toHaveBeenCalled();
  });

  it('shows the copy notice after duplicating', async () => {
    nav.search = `id=${PUBLISHED.id}&aviso=copia`;
    render(<ProductEditorPage mode="edit" />);
    const notice = await screen.findByText(/Esta es una copia en borrador/);
    expect(notice.closest('[role="status"]')).toHaveFocus();
  });

  it('says when the product does not exist', async () => {
    data.fetchProduct.mockResolvedValue(null);
    render(<ProductEditorPage mode="edit" />);
    expect(
      await screen.findByRole('heading', { name: 'No encontramos este producto' }),
    ).toBeVisible();
  });

  it('saves the hidden prices and stock', async () => {
    data.saveCommerce.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductEditorPage mode="edit" />);
    const commerce = await screen.findByRole('form', { name: 'Comercial' });
    await user.click(within(commerce).getByRole('button', { name: 'Agregar precio' }));
    await user.type(within(commerce).getByLabelText(/Precio por pieza/), '450');
    await user.type(within(commerce).getByLabelText('Existencias en Coapa'), '7');
    await user.click(within(commerce).getByRole('button', { name: 'Guardar datos comerciales' }));
    expect(await within(commerce).findByRole('status')).toHaveTextContent(
      'Datos comerciales guardados.',
    );
    expect(data.saveCommerce).toHaveBeenCalledWith({}, PUBLISHED.id, [
      {
        variantId: 'v1',
        prices: [{ minQty: 1, unitPriceCents: 45000 }],
        stock: [{ storeId: 't1', quantity: 7 }],
      },
    ]);
  });
});
