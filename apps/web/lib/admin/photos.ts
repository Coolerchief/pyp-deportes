import {
  type Database,
  MEDIA_CONTENT_TYPE,
  MEDIA_WIDTHS,
  type SignUploadResponse,
} from '@pyp/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

// Product photos in the panel (T4.5, TRD §6.2): crop to 4:5 in the browser, resize to the four
// widths, encode WebP, upload straight to R2 with the URLs of sign-upload and record the photo
// with admin_add_product_image. The photo never goes through Supabase.

type Client = SupabaseClient<Database>;

export const PHOTO_ASPECT = 4 / 5;
export const MAX_PHOTOS = 12;
const WEBP_QUALITY = 0.8;
/** Larger files are refused before opening them (TRD §8). */
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
/** A 12 MP iPhone photo converts in a few seconds; past this the conversion is given up. */
export const HEIC_TIMEOUT_MS = 30_000;

// Crop math (pure) -----------------------------------------------------------------------------

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
/** The part of the source image that becomes the photo, in source pixels. */
export type CropRect = { x: number; y: number; width: number; height: number };

/** The largest 4:5 rectangle that fits in the image. */
export function baseCropSize(image: Size, aspect = PHOTO_ASPECT): Size {
  return image.width / image.height > aspect
    ? { width: image.height * aspect, height: image.height }
    : { width: image.width, height: image.width / aspect };
}

/**
 * The crop for a zoom (1 = the largest 4:5 that fits) centered on `center`, moved back inside
 * the image when it would leave it.
 */
export function cropRect(
  image: Size,
  zoom: number,
  center: Point,
  aspect = PHOTO_ASPECT,
): CropRect {
  const base = baseCropSize(image, aspect);
  const z = Math.min(Math.max(zoom, 1), 8);
  const width = base.width / z;
  const height = base.height / z;
  const x = Math.min(Math.max(center.x - width / 2, 0), image.width - width);
  const y = Math.min(Math.max(center.y - height / 2, 0), image.height - height);
  return { x, y, width, height };
}

export function centerOf(rect: CropRect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Size recorded in product_images: the cropped original, exactly 4:5. */
export function recordedSize(rect: CropRect): Size {
  const width = Math.round(rect.width);
  return { width, height: Math.round(width / PHOTO_ASPECT) };
}

/** The crop is big enough for the 320 px version (the database asks for 320 × 400 or more). */
export function isBigEnough(rect: CropRect): boolean {
  return rect.width >= 320 - 0.5;
}

// Files ----------------------------------------------------------------------------------------

export function isHeicFile(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export type DecodedPhoto = { bitmap: ImageBitmap; previewUrl: string; size: Size };

/**
 * Opens a photo: the browser decodes JPEG, PNG and WebP (and HEIC on Safari); other HEIC files
 * (an iPhone photo on Windows or Android) go through heic-to, loaded only then. EXIF rotation is
 * applied.
 */
export async function decodePhoto(file: File): Promise<DecodedPhoto> {
  if (file.size > MAX_FILE_BYTES) throw new PhotoError('too_big');
  let source: Blob = file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (!isHeicFile(file)) throw new PhotoError('unreadable');
  }
  if (!bitmap) {
    try {
      const { heicTo } = await import('heic-to/next');
      // heic-to logs some failures in its worker without rejecting: a time limit keeps the
      // panel from waiting forever.
      source = await Promise.race([
        heicTo({ blob: file, type: 'image/jpeg', quality: 0.92 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), HEIC_TIMEOUT_MS),
        ),
      ]);
      bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
    } catch {
      throw new PhotoError('heic');
    }
  }
  return {
    bitmap,
    previewUrl: URL.createObjectURL(source),
    size: { width: bitmap.width, height: bitmap.height },
  };
}

function canvasOf(size: Size): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  return canvas;
}

/** WebP from the canvas; Safari cannot encode it, so @jsquash/webp does it there (lazy). */
async function toWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  const native = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, MEDIA_CONTENT_TYPE, WEBP_QUALITY),
  );
  if (native && native.type === MEDIA_CONTENT_TYPE) return native;
  const context = canvas.getContext('2d');
  if (!context) throw new PhotoError('unreadable');
  const { default: encode } = await import('@jsquash/webp/encode');
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const buffer = await encode(data, { quality: WEBP_QUALITY * 100 });
  return new Blob([buffer], { type: MEDIA_CONTENT_TYPE });
}

/**
 * The WebP files of a crop, from the largest width down (each one resized from the previous,
 * which keeps the small ones sharp).
 */
export async function renderWidths(
  bitmap: ImageBitmap,
  rect: CropRect,
  widths: readonly number[] = MEDIA_WIDTHS.product,
): Promise<{ width: number; blob: Blob }[]> {
  const sorted = [...widths].sort((a, b) => b - a);
  const results: { width: number; blob: Blob }[] = [];
  let previous: HTMLCanvasElement | null = null;
  for (const width of sorted) {
    const canvas = canvasOf({ width, height: Math.round(width / PHOTO_ASPECT) });
    const context = canvas.getContext('2d');
    if (!context) throw new PhotoError('unreadable');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    if (previous) context.drawImage(previous, 0, 0, canvas.width, canvas.height);
    else {
      context.drawImage(
        bitmap,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }
    results.push({ width, blob: await toWebp(canvas) });
    previous = canvas;
  }
  return results.sort((a, b) => a.width - b.width);
}

// Upload ---------------------------------------------------------------------------------------

export type PhotoErrorCode =
  | 'unreadable'
  | 'heic'
  | 'too_big'
  | 'too_small'
  | 'not_configured'
  | 'session'
  | 'forbidden'
  | 'upload'
  | 'save'
  | 'network';

export class PhotoError extends Error {
  constructor(
    readonly code: PhotoErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'PhotoError';
  }
}

export function photoErrorMessage(error: unknown): string {
  const code = error instanceof PhotoError ? error.code : 'network';
  switch (code) {
    case 'unreadable':
      return 'No pudimos abrir esa foto. Prueba con otra en JPG, PNG, WebP o HEIC.';
    case 'heic':
      return 'No pudimos convertir esa foto HEIC. Desde el iPhone, compártela como JPG o elige «Más compatible» en Ajustes → Cámara → Formatos.';
    case 'too_big':
      return 'La foto pesa más de 15 MB. Elige otra o tómala con menos resolución.';
    case 'too_small':
      return 'La foto es muy pequeña: el recorte necesita al menos 320 px de ancho.';
    case 'not_configured':
      return 'Las fotos aún no están configuradas: falta conectar el almacenamiento (R2). Avisa al administrador.';
    case 'session':
      return 'Tu sesión terminó. Vuelve a entrar y sube la foto otra vez.';
    case 'forbidden':
      return 'Tu cuenta no puede subir fotos.';
    case 'upload':
      return 'No se pudo subir la foto al almacenamiento. Revisa tu conexión e inténtalo de nuevo.';
    case 'save':
      return error instanceof PhotoError && error.message !== 'save'
        ? error.message
        : 'La foto se subió, pero no pudimos guardarla en el producto. Inténtalo de nuevo.';
    default:
      return 'No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.';
  }
}

type FunctionsError = { name?: string; context?: { status?: number } };

async function signUpload(
  supabase: Client,
  productId: string,
  imageId: string,
): Promise<SignUploadResponse> {
  const { data, error } = await supabase.functions.invoke<SignUploadResponse>('sign-upload', {
    body: {
      scope: 'product',
      ownerId: productId,
      imageId,
      widths: [...MEDIA_WIDTHS.product],
      contentType: MEDIA_CONTENT_TYPE,
    },
  });
  if (error || !data) {
    const status = (error as FunctionsError | null)?.context?.status;
    if (status === 503) throw new PhotoError('not_configured');
    if (status === 401) throw new PhotoError('session');
    if (status === 403) throw new PhotoError('forbidden');
    throw new PhotoError('network');
  }
  return data;
}

export type UploadStep = 'preparing' | 'uploading' | 'saving';

/**
 * Crop → four WebP → signed PUTs to R2 → admin_add_product_image. Returns the image id and the
 * 320 px file, which the panel shows until the photo is served from R2.
 */
export async function uploadProductPhoto(input: {
  supabase: Client;
  productId: string;
  bitmap: ImageBitmap;
  rect: CropRect;
  alt: string;
  onProgress?: (step: UploadStep, fraction: number) => void;
  doFetch?: typeof fetch;
  /** Tests only: the canvas step (jsdom has no canvas). */
  render?: typeof renderWidths;
}): Promise<{ imageId: string; thumbnail: Blob }> {
  const {
    supabase,
    productId,
    bitmap,
    rect,
    alt,
    onProgress,
    doFetch = fetch,
    render = renderWidths,
  } = input;
  if (!isBigEnough(rect)) throw new PhotoError('too_small');
  onProgress?.('preparing', 0);
  const files = await render(bitmap, rect);
  const imageId = crypto.randomUUID();
  const signed = await signUpload(supabase, productId, imageId);

  let done = 0;
  onProgress?.('uploading', 0);
  await Promise.all(
    signed.uploads.map(async (upload) => {
      const file = files.find((f) => f.width === upload.width);
      if (!file) throw new PhotoError('upload');
      const response = await doFetch(upload.url, {
        method: 'PUT',
        headers: signed.headers,
        body: file.blob,
      }).catch(() => null);
      if (!response?.ok) throw new PhotoError('upload');
      done += 1;
      onProgress?.('uploading', done / signed.uploads.length);
    }),
  );

  onProgress?.('saving', 1);
  const size = recordedSize(rect);
  const { error } = await supabase.rpc('admin_add_product_image', {
    product_id: productId,
    image_id: imageId,
    width: size.width,
    height: size.height,
    alt: alt.trim(),
  });
  if (error) {
    throw new PhotoError(
      'save',
      error.code === '22023' && error.message ? error.message : undefined,
    );
  }
  return { imageId, thumbnail: files[0]!.blob };
}

// The photos of a product ----------------------------------------------------------------------

export async function updatePhotoAlt(supabase: Client, imageId: string, alt: string) {
  const { error } = await supabase
    .from('product_images')
    .update({ alt: alt.trim().slice(0, 200) })
    .eq('id', imageId);
  if (error) throw error;
}

/** Removes the photo from the product; the files stay in R2 (the name is never reused). */
export async function deletePhoto(supabase: Client, imageId: string) {
  const { error } = await supabase.from('product_images').delete().eq('id', imageId);
  if (error) throw error;
}

export async function reorderPhotos(supabase: Client, productId: string, imageIds: string[]) {
  const { error } = await supabase.rpc('admin_reorder_product_images', {
    product_id: productId,
    image_ids: imageIds,
  });
  if (error) throw error;
}

/** Moves one item of a list by `delta` places, within its ends. */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const target = Math.min(Math.max(index + delta, 0), list.length - 1);
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}
