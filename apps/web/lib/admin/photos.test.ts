import { describe, expect, it, vi } from 'vitest';
import {
  baseCropSize,
  decodePhoto,
  cropRect,
  isBigEnough,
  isHeicFile,
  moveItem,
  PhotoError,
  photoErrorMessage,
  recordedSize,
  uploadProductPhoto,
} from './photos';

describe('crop math', () => {
  it('takes the largest 4:5 that fits', () => {
    expect(baseCropSize({ width: 4000, height: 3000 })).toEqual({ width: 2400, height: 3000 });
    expect(baseCropSize({ width: 1000, height: 2000 })).toEqual({ width: 1000, height: 1250 });
  });

  it('zooms around the center and never leaves the image', () => {
    const image = { width: 4000, height: 3000 };
    expect(cropRect(image, 1, { x: 2000, y: 1500 })).toEqual({
      x: 800,
      y: 0,
      width: 2400,
      height: 3000,
    });
    expect(cropRect(image, 2, { x: 2000, y: 1500 })).toEqual({
      x: 1400,
      y: 750,
      width: 1200,
      height: 1500,
    });
    // Dragged past the corner: it stays inside.
    expect(cropRect(image, 2, { x: -500, y: 99999 })).toEqual({
      x: 0,
      y: 1500,
      width: 1200,
      height: 1500,
    });
    // Zoom below 1 is 1.
    expect(cropRect(image, 0.2, { x: 0, y: 0 }).width).toBe(2400);
  });

  it('records the cropped size as exact 4:5 and checks it is big enough', () => {
    expect(recordedSize({ x: 0, y: 0, width: 1023.6, height: 1279.5 })).toEqual({
      width: 1024,
      height: 1280,
    });
    expect(isBigEnough({ x: 0, y: 0, width: 320, height: 400 })).toBe(true);
    expect(isBigEnough({ x: 0, y: 0, width: 300, height: 375 })).toBe(false);
  });
});

describe('files and lists', () => {
  it('spots HEIC by type or name', () => {
    expect(isHeicFile(new File([], 'IMG_0001.HEIC'))).toBe(true);
    expect(isHeicFile(new File([], 'foto', { type: 'image/heif' }))).toBe(true);
    expect(isHeicFile(new File([], 'foto.jpg', { type: 'image/jpeg' }))).toBe(false);
  });

  it('moves an item within the list', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 0, 5)).toEqual(['b', 'c', 'a']);
  });

  it('refuses files over 15 MB before opening them', async () => {
    const big = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'enorme.jpg', {
      type: 'image/jpeg',
    });
    await expect(decodePhoto(big)).rejects.toMatchObject({ code: 'too_big' });
    expect(photoErrorMessage(new PhotoError('too_big'))).toMatch(/15 MB/);
  });

  it('explains each failure in Spanish', () => {
    expect(photoErrorMessage(new PhotoError('not_configured'))).toMatch(/almacenamiento \(R2\)/);
    expect(
      photoErrorMessage(new PhotoError('save', 'Cada producto puede tener hasta 12 fotos.')),
    ).toBe('Cada producto puede tener hasta 12 fotos.');
    expect(photoErrorMessage(new Error('?'))).toMatch(/Revisa tu conexión/);
  });
});

describe('uploadProductPhoto', () => {
  const rect = { x: 0, y: 0, width: 2000, height: 2500 };
  const render = vi.fn(async () =>
    [320, 640, 1024, 1600].map((width) => ({ width, blob: new Blob([String(width)]) })),
  );
  const signed = {
    keyBase: 'p/p1/i1',
    uploads: [320, 640, 1024, 1600].map((width) => ({
      width,
      key: `p/p1/i1-${width}.webp`,
      url: `https://r2.test/${width}`,
    })),
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    expiresIn: 600,
  };

  function client(invoke: unknown, rpc: unknown = { error: null }) {
    return {
      functions: { invoke: vi.fn(async () => invoke) },
      rpc: vi.fn(async () => rpc),
    };
  }

  it('signs, uploads the four widths with the signed headers and records the photo', async () => {
    const supabase = client({ data: signed, error: null });
    const doFetch = vi.fn(async () => new Response(null, { status: 200 }));
    const steps: string[] = [];
    const { imageId: id, thumbnail } = await uploadProductPhoto({
      supabase: supabase as never,
      productId: 'p1',
      bitmap: {} as ImageBitmap,
      rect,
      alt: ' Balón blanco ',
      render,
      doFetch,
      onProgress: (step) => steps.push(step),
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await thumbnail.text()).toBe('320');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('sign-upload', {
      body: {
        scope: 'product',
        ownerId: 'p1',
        imageId: id,
        widths: [320, 640, 1024, 1600],
        contentType: 'image/webp',
      },
    });
    expect(doFetch).toHaveBeenCalledTimes(4);
    expect(doFetch).toHaveBeenCalledWith('https://r2.test/320', {
      method: 'PUT',
      headers: signed.headers,
      body: expect.any(Blob),
    });
    expect(supabase.rpc).toHaveBeenCalledWith('admin_add_product_image', {
      product_id: 'p1',
      image_id: id,
      width: 2000,
      height: 2500,
      alt: 'Balón blanco',
    });
    expect(steps[0]).toBe('preparing');
    expect(steps.at(-1)).toBe('saving');
  });

  it('tells apart the reasons it can fail', async () => {
    const base = { productId: 'p1', bitmap: {} as ImageBitmap, rect, alt: '', render };
    const fails = async (supabase: unknown, doFetch?: typeof fetch) =>
      uploadProductPhoto({ ...base, supabase: supabase as never, doFetch }).catch(
        (error: PhotoError) => error.code,
      );
    const status = (code: number) => ({
      data: null,
      error: { name: 'FunctionsHttpError', context: { status: code } },
    });
    expect(await fails(client(status(503)))).toBe('not_configured');
    expect(await fails(client(status(401)))).toBe('session');
    expect(await fails(client(status(403)))).toBe('forbidden');
    expect(
      await fails(
        client({ data: signed, error: null }),
        async () => new Response(null, { status: 403 }),
      ),
    ).toBe('upload');
    expect(
      await fails(
        client({ data: signed, error: null }, { error: { code: '22023', message: 'Máximo 12.' } }),
        async () => new Response(null),
      ),
    ).toBe('save');
    expect(
      await uploadProductPhoto({
        ...base,
        rect: { x: 0, y: 0, width: 200, height: 250 },
        supabase: client({ data: signed, error: null }) as never,
      }).catch((error: PhotoError) => error.code),
    ).toBe('too_small');
  });
});
