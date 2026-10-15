import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportPage } from './ImportPage';

// T4.6: the importer screen with Supabase stubbed; reading and checking the file are real.

const db = vi.hoisted(() => ({
  existing: [] as string[],
  rpc: vi.fn(),
  products: [] as { id: string; sku: string; name: string }[],
}));
vi.mock('@/lib/supabase/browser', () => ({
  getSupabase: () => ({
    rpc: db.rpc,
    from: () => ({
      select: (columns: string) => ({
        in: async (_column: string, skus: string[]) => ({
          data: columns.includes('name')
            ? db.products.filter((p) => skus.includes(p.sku))
            : db.existing.filter((sku) => skus.includes(sku)).map((sku) => ({ sku })),
          error: null,
        }),
      }),
    }),
  }),
}));
const upload = vi.hoisted(() => vi.fn());
vi.mock('@/lib/admin/bulk-photos', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/admin/bulk-photos')>()),
  uploadMatchedPhoto: upload,
}));

const HEADER =
  'sku,slug,nombre,marca,categoria,subcategoria,deportes,publico,descripcion_corta,personalizable,tecnicas,tallas,colores,destacado,estado,origen,url_anterior';
const row = (sku: string, slug = sku.toLowerCase()) =>
  `${sku},${slug},Producto ${sku},Molten,balones,,futbol,unisex,,no,,4|5,,no,publicado,,`;
const csv = (...rows: string[]) =>
  new File([[HEADER, ...rows].join('\n')], 'productos.csv', { type: 'text/csv' });

beforeEach(() => {
  db.existing = [];
  db.products = [];
  db.rpc.mockReset();
  upload.mockReset();
});

async function chooseFile(file: File) {
  const user = userEvent.setup();
  render(<ImportPage />);
  await user.upload(screen.getByTestId('importar-input'), file);
  return user;
}

describe('ImportPage', () => {
  it('offers the template and explains the format', () => {
    render(<ImportPage />);
    expect(screen.getByRole('button', { name: 'Descargar plantilla' })).toBeVisible();
    expect(screen.getByText(/Un SKU que ya existe se actualiza/)).toBeVisible();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Archivo');
  });

  it('previews new, updated and invalid rows before importing', async () => {
    db.existing = ['BAL-901'];
    await chooseFile(csv(row('BAL-900'), row('BAL-901'), row('BAL-902', 'Mal Slug')));
    expect(await screen.findByText('2 · Revisa antes de importar')).toBeVisible();
    const counts = (label: string) => screen.getByText(label).previousSibling?.textContent;
    expect(counts('filas')).toBe('3');
    expect(counts('nuevos')).toBe('1');
    expect(counts('se actualizan')).toBe('1');
    expect(counts('con error')).toBe('1');
    const errors = screen.getByRole('table', { name: 'Filas con error' });
    expect(within(errors).getByRole('row', { name: /4 BAL-902/ })).toHaveTextContent(
      'El slug solo puede tener minúsculas, números y guiones.',
    );
    expect(screen.getByRole('button', { name: 'Importar solo las 2 válidas' })).toBeEnabled();
  });

  it('imports in batches and shows the result', async () => {
    db.rpc.mockResolvedValue({
      data: {
        created: 1,
        updated: 1,
        errors: [],
        warnings: [{ row: 3, sku: 'BAL-901', message: 'El producto conserva su slug "x".' }],
      },
      error: null,
    });
    const user = await chooseFile(csv(row('BAL-900'), row('BAL-901')));
    await user.click(await screen.findByRole('button', { name: 'Importar 2 productos' }));
    expect(await screen.findByText(/Importación terminada/)).toBeVisible();
    expect(db.rpc).toHaveBeenCalledWith('admin_import_products', {
      rows: [
        expect.objectContaining({ sku: 'BAL-900', _row: 2 }),
        expect.objectContaining({ sku: 'BAL-901', _row: 3 }),
      ],
    });
    expect(screen.getByText('creados').previousSibling).toHaveTextContent('1');
    expect(screen.getByText(/Fila 3 \(BAL-901\): El producto conserva su slug/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver productos' })).toHaveAttribute(
      'href',
      '/admin/productos',
    );
  });

  it('says when the file lacks columns', async () => {
    await chooseFile(new File(['sku,nombre\nA,B'], 'otro.csv', { type: 'text/csv' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Al archivo le faltan columnas de la plantilla: slug',
    );
  });

  it('continues after a batch that could not be sent', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => row(`S-${100 + i}`));
    db.rpc
      .mockResolvedValueOnce({
        data: { created: 50, updated: 0, errors: [], warnings: [] },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: { message: 'Failed to fetch' } })
      .mockResolvedValueOnce({
        data: { created: 10, updated: 0, errors: [], warnings: [] },
        error: null,
      });
    const user = await chooseFile(csv(...rows));
    await user.click(await screen.findByRole('button', { name: 'Importar 60 productos' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Se cortó la conexión en el lote 2');
    await user.click(screen.getByRole('button', { name: 'Continuar la importación' }));
    expect(await screen.findByText(/Importación terminada/)).toBeVisible();
    expect(screen.getByText('creados').previousSibling).toHaveTextContent('60');
    expect(db.rpc).toHaveBeenCalledTimes(3);
  });
});

describe('BulkPhotos', () => {
  it('matches the files by SKU, lists the rest and uploads in order', async () => {
    db.products = [{ id: 'p1', sku: 'BAL-001', name: 'Balón' }];
    upload.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ImportPage />);
    const photo = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('fotos-lote-input'), [
      photo('BAL-001-2.jpg'),
      photo('BAL-001.jpg'),
      photo('NADA.jpg'),
    ]);
    const unmatched = await screen.findByRole('group', { name: 'Fotos sin producto' });
    expect(unmatched).toHaveTextContent('1 foto no coincide con ningún SKU');
    expect(unmatched).toHaveTextContent('NADA.jpg');
    await user.click(screen.getByRole('button', { name: 'Subir 2 fotos' }));
    expect(await screen.findByRole('status')).toHaveTextContent('2 fotos subidas.');
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    expect(upload.mock.calls.map((call) => [call[1].file.name, call[1].order])).toEqual([
      ['BAL-001.jpg', 1],
      ['BAL-001-2.jpg', 2],
    ]);
  });
});
