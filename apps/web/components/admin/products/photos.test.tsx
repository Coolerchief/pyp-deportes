import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EMPTY_PRODUCT_FORM } from '@pyp/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DecodedPhoto } from '@/lib/admin/photos';
import type { EditorProduct } from '@/lib/admin/products';
import { PhotoCropper } from './PhotoCropper';
import { PhotosSection } from './PhotosSection';
import { ProductPreview } from './ProductPreview';

// T4.5: photos and preview with the browser-only steps (decode, canvas, R2) stubbed.

vi.mock('@/lib/supabase/browser', () => ({ getSupabase: () => ({}) }));
const photos = vi.hoisted(() => ({
  decodePhoto: vi.fn(),
  uploadProductPhoto: vi.fn(),
  updatePhotoAlt: vi.fn(),
  deletePhoto: vi.fn(),
  reorderPhotos: vi.fn(),
}));
vi.mock('@/lib/admin/photos', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/admin/photos')>()),
  ...photos,
}));
const data = vi.hoisted(() => ({ fetchProduct: vi.fn() }));
vi.mock('@/lib/admin/products', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/admin/products')>()),
  ...data,
}));
const preview = vi.hoisted(() => ({ fetchPreviewTaxonomy: vi.fn() }));
vi.mock('@/lib/admin/preview', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/admin/preview')>()),
  ...preview,
}));

const ID = '0b6f0b6f-0000-4000-8000-000000000001';
const image = (n: number, alt = '') => ({
  id: `0b6f0b6f-0000-4000-8000-00000000000${n}`,
  keyBase: `p/${ID}/i${n}`,
  alt,
  width: 1600,
  height: 2000,
});

const PRODUCT: EditorProduct = {
  id: ID,
  status: 'draft',
  publishedAt: null,
  updatedAt: '2026-10-14T00:00:00Z',
  option1Name: 'Talla',
  option2Name: null,
  colorNote: null,
  photoCount: 2,
  images: [image(1, 'Frente'), image(2)],
  variants: [
    {
      id: 'f0000000-0000-4000-8000-000000000001',
      sku: 'BAL-001',
      option1: null,
      option2: null,
      isDefault: true,
      prices: [],
      stock: [],
    },
  ],
  allVariants: [],
  form: {
    ...EMPTY_PRODUCT_FORM,
    name: 'Balón Molten',
    sku: 'BAL-001',
    slug: 'balon-molten',
    brandId: 'b0000000-0000-4000-8000-000000000001',
    categoryId: 'c0000000-0000-4000-8000-000000000001',
  },
};

const DECODED: DecodedPhoto = {
  bitmap: {} as ImageBitmap,
  previewUrl: 'blob:foto',
  size: { width: 3000, height: 4000 },
};

beforeEach(() => {
  for (const fn of [...Object.values(photos), ...Object.values(data), ...Object.values(preview)]) {
    fn.mockReset();
  }
});

describe('PhotoCropper', () => {
  it('crops 4:5, zooms with the keyboard and passes the alt text', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <PhotoCropper
        photo={DECODED}
        name="IMG_0001.HEIC"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    const frame = screen.getByRole('img', { name: 'Recorte 4:5 de la foto' });
    frame.focus();
    await user.keyboard('++');
    await user.keyboard('{ArrowRight}');
    await user.type(screen.getByLabelText(/Texto alternativo/), 'Balón blanco');
    await user.click(screen.getByRole('button', { name: 'Subir foto' }));
    const [rect, alt] = onConfirm.mock.calls[0]!;
    expect(alt).toBe('Balón blanco');
    expect(rect.width).toBeCloseTo(2000);
    expect(rect.height).toBeCloseTo(2500);
    expect(rect.x).toBeGreaterThan(500); // moved right from the centered 500
  });

  it('does not let a crop too small be uploaded', () => {
    render(
      <PhotoCropper
        photo={{ ...DECODED, size: { width: 400, height: 500 } }}
        name="chica.jpg"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '3' } });
    expect(screen.getByRole('alert')).toHaveTextContent('muy pequeña');
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeDisabled();
  });
});

describe('PhotosSection', () => {
  it('shows the photos with the first one as cover', () => {
    render(<PhotosSection product={PRODUCT} onSaved={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).getByText('Portada')).toBeVisible();
    expect(within(items[0]!).getByRole('img', { name: 'Frente' })).toHaveAttribute(
      'src',
      `https://media.pypdeportescoapa.com/p/${ID}/i1-320.webp`,
    );
    expect(screen.getByText(/2 de 12\. La primera es la portada\./)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mover foto 1 antes' })).toBeDisabled();
  });

  it('crops, uploads with progress and refreshes the product', async () => {
    const fresh = { ...PRODUCT, images: [...PRODUCT.images, image(3, 'Nueva')], photoCount: 3 };
    photos.decodePhoto.mockResolvedValue(DECODED);
    let finish: (result: { imageId: string; thumbnail: Blob }) => void = () => {};
    photos.uploadProductPhoto.mockImplementation(({ onProgress }) => {
      onProgress?.('uploading', 0.5);
      return new Promise((resolve) => (finish = resolve));
    });
    data.fetchProduct.mockResolvedValue(fresh);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<PhotosSection product={PRODUCT} onSaved={onSaved} />);
    await user.upload(
      screen.getByTestId('fotos-input'),
      new File(['x'], 'IMG_0001.jpg', { type: 'image/jpeg' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Recortar foto' });
    await user.type(within(dialog).getByLabelText(/Texto alternativo/), 'Nueva');
    await user.click(within(dialog).getByRole('button', { name: 'Subir foto' }));
    expect(await screen.findByText('Subiendo…')).toBeVisible();
    expect(photos.uploadProductPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ productId: ID, alt: 'Nueva', bitmap: DECODED.bitmap }),
    );
    finish({ imageId: '0b6f0b6f-0000-4000-8000-000000000003', thumbnail: new Blob(['x']) });
    expect(await screen.findByRole('status')).toHaveTextContent('Foto agregada.');
    expect(onSaved).toHaveBeenCalledWith(fresh);
  });

  it('keeps a failed upload to retry it', async () => {
    const { PhotoError } =
      await vi.importActual<typeof import('@/lib/admin/photos')>('@/lib/admin/photos');
    photos.decodePhoto.mockResolvedValue(DECODED);
    photos.uploadProductPhoto
      .mockRejectedValueOnce(new PhotoError('not_configured'))
      .mockResolvedValueOnce({
        imageId: '0b6f0b6f-0000-4000-8000-000000000003',
        thumbnail: new Blob(['x']),
      });
    data.fetchProduct.mockResolvedValue(PRODUCT);
    const user = userEvent.setup();
    render(<PhotosSection product={PRODUCT} onSaved={vi.fn()} />);
    await user.upload(
      screen.getByTestId('fotos-input'),
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Subir foto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('falta conectar el almacenamiento');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Foto agregada.');
    expect(photos.uploadProductPhoto).toHaveBeenCalledTimes(2);
  });

  it('says when a file cannot be opened', async () => {
    const { PhotoError } =
      await vi.importActual<typeof import('@/lib/admin/photos')>('@/lib/admin/photos');
    photos.decodePhoto.mockRejectedValue(new PhotoError('unreadable'));
    const user = userEvent.setup();
    render(<PhotosSection product={PRODUCT} onSaved={vi.fn()} />);
    await user.upload(
      screen.getByTestId('fotos-input'),
      new File(['x'], 'doc.jpg', { type: 'image/jpeg' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'doc.jpg: No pudimos abrir esa foto.',
    );
  });

  it('reorders, saves the alt text and removes after confirming', async () => {
    photos.reorderPhotos.mockResolvedValue(undefined);
    photos.updatePhotoAlt.mockResolvedValue(undefined);
    photos.deletePhoto.mockResolvedValue(undefined);
    data.fetchProduct.mockResolvedValue(PRODUCT);
    const user = userEvent.setup();
    render(<PhotosSection product={PRODUCT} onSaved={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Mover foto 2 antes' }));
    await waitFor(() =>
      expect(photos.reorderPhotos).toHaveBeenCalledWith({}, ID, [image(2).id, image(1).id]),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Portada cambiada.');

    const alts = screen.getAllByLabelText('Texto alternativo');
    await user.type(alts[1]!, 'Espalda{Enter}');
    expect(photos.updatePhotoAlt).toHaveBeenCalledWith({}, image(2).id, 'Espalda');
    expect(await screen.findByText('Guardado.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Quitar foto 1' }));
    expect(screen.getByText('¿Quitar esta foto?')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Quitar' }));
    await waitFor(() => expect(photos.deletePhoto).toHaveBeenCalledWith({}, image(1).id));
  });
});

describe('ProductPreview', () => {
  it('shows the public page of the saved product, inert', async () => {
    preview.fetchPreviewTaxonomy.mockResolvedValue({
      public_categories: [
        {
          id: PRODUCT.form.categoryId,
          parent_id: null,
          slug: 'balones',
          name: 'Balones',
          size_label: 'Tamaño',
          sort_order: 0,
        },
      ],
      public_brands: [
        {
          id: PRODUCT.form.brandId,
          slug: 'molten',
          name: 'Molten',
          logo_key: null,
          is_own_brand: false,
          sort_order: 0,
        },
      ],
      public_sports: [],
    });
    const user = userEvent.setup();
    render(<ProductPreview product={PRODUCT} />);
    await user.click(screen.getByRole('button', { name: 'Ver vista previa' }));
    const region = await screen.findByRole('region', { name: 'Vista previa de la ficha' });
    expect(within(region).getByRole('heading', { level: 1, name: 'Balón Molten' })).toBeVisible();
    expect(region).toHaveAttribute('inert');
    expect(within(region).getAllByRole('img').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Ocultar vista previa' }));
    expect(screen.queryByRole('region', { name: 'Vista previa de la ficha' })).toBeNull();
  });
});
