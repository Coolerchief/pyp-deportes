import { expect, type Page, test } from '@playwright/test';
import sharp from 'sharp';
import { logIn, stubSupabase } from './admin-helpers';

// T4.5: a photo goes from the file to R2 in the real browser (decode, 4:5 crop, canvas, WebP)
// with sign-upload, the R2 PUTs and PostgREST stubbed. The image is generated here; no photo
// lives in the repository (rule 3).

const PRODUCT_ID = '0b6f0b6f-0000-4000-8000-0000000000b1';
const BRAND = { id: 'b0000000-0000-4000-8000-000000000001', name: 'Marca Prueba' };
const CATEGORY = {
  id: 'c0000000-0000-4000-8000-000000000001',
  name: 'Balones',
  parent_id: null,
  size_label: 'Tamaño',
};

type Image = {
  id: string;
  key_base: string;
  alt: string;
  width: number;
  height: number;
  sort_order: number;
};

function productRow(images: Image[]) {
  return {
    id: PRODUCT_ID,
    sku: 'BAL-T45',
    slug: 'balon-t45',
    name: 'Balón T45',
    brand_id: BRAND.id,
    category_id: CATEGORY.id,
    subcategory_id: null,
    audience: 'unisex',
    short_description: 'Para escuelas.',
    description: '',
    specs: [],
    tags: [],
    option1_name: 'Tamaño',
    option2_name: null,
    color_note: null,
    is_customizable: false,
    techniques: [],
    min_suggested_qty: null,
    is_featured: false,
    status: 'draft',
    published_at: null,
    updated_at: '2026-10-14T16:00:00Z',
    product_sports: [],
    product_images: images,
    product_variants: [
      {
        id: 'f0000000-0000-4000-8000-0000000000b1',
        sku: 'BAL-T45',
        option1_value: null,
        option2_value: null,
        is_default: true,
        is_active: true,
        sort_order: 0,
        variant_prices: [],
        inventory_levels: [],
      },
    ],
  };
}

async function stubPhotos(page: Page) {
  const state = {
    images: [] as Image[],
    puts: [] as { url: string; type: string | null; cache: string | null; head: string }[],
    signed: null as null | Record<string, unknown>,
    added: null as null | Record<string, unknown>,
  };
  const json = (body: unknown) => ({ json: body });
  await page.route('**/rest/v1/categories?**', (r) => r.fulfill(json([CATEGORY])));
  await page.route('**/rest/v1/brands?**', (r) => r.fulfill(json([BRAND])));
  await page.route('**/rest/v1/sports?**', (r) => r.fulfill(json([])));
  await page.route('**/rest/v1/stores?**', (r) => r.fulfill(json([])));
  await page.route('**/rest/v1/products?**', (route) => {
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const row = productRow(state.images);
    return route.fulfill(json(single ? row : [row]));
  });
  await page.route('**/functions/v1/sign-upload', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
    const body = route.request().postDataJSON() as { imageId: string; widths: number[] };
    state.signed = body;
    const keyBase = `p/${PRODUCT_ID}/${body.imageId}`;
    return route.fulfill(
      json({
        keyBase,
        uploads: body.widths.map((width) => ({
          width,
          key: `${keyBase}-${width}.webp`,
          url: `https://r2.e2e.test/${keyBase}-${width}.webp?firma=1`,
        })),
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        expiresIn: 600,
      }),
    );
  });
  await page.route('https://r2.e2e.test/**', (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'PUT',
          'access-control-allow-headers': 'content-type, cache-control',
        },
      });
    }
    const buffer = request.postDataBuffer();
    state.puts.push({
      url: request.url(),
      type: request.headers()['content-type'] ?? null,
      cache: request.headers()['cache-control'] ?? null,
      head: buffer ? buffer.subarray(0, 12).toString('latin1') : '',
    });
    return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.route('**/rest/v1/rpc/admin_add_product_image', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown> & {
      image_id: string;
      width: number;
      height: number;
      alt: string;
    };
    state.added = body;
    state.images.push({
      id: body.image_id,
      key_base: `p/${PRODUCT_ID}/${body.image_id}`,
      alt: body.alt,
      width: body.width,
      height: body.height,
      sort_order: state.images.length,
    });
    return route.fulfill(json(body.image_id));
  });
  // The preview reads the public taxonomy.
  await page.route('**/rest/v1/public_categories?**', (r) =>
    r.fulfill(json([{ ...CATEGORY, slug: 'balones', sort_order: 0 }])),
  );
  await page.route('**/rest/v1/public_brands?**', (r) =>
    r.fulfill(
      json([
        { ...BRAND, slug: 'marca-prueba', logo_key: null, is_own_brand: false, sort_order: 0 },
      ]),
    ),
  );
  await page.route('**/rest/v1/public_sports?**', (r) => r.fulfill(json([])));
  return state;
}

test('a photo is cropped to 4:5, encoded to WebP in four widths and uploaded to R2', async ({
  page,
}) => {
  await stubSupabase(page, { role: 'editor', full_name: 'Beto Ruiz', is_active: true });
  const state = await stubPhotos(page);
  // A landscape photo of 2000 × 1500: the crop takes the largest 4:5 (1200 × 1500).
  const photo = await sharp({
    create: { width: 2000, height: 1500, channels: 3, background: { r: 230, g: 51, b: 35 } },
  })
    .jpeg()
    .toBuffer();

  await page.goto('/admin/login');
  await logIn(page);
  await page.goto(`/admin/productos/editar?id=${PRODUCT_ID}`);
  await expect(page.getByRole('heading', { name: 'Fotos' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'IMG_0001.jpg',
    mimeType: 'image/jpeg',
    buffer: photo,
  });

  const dialog = page.getByRole('dialog', { name: 'Recortar foto' });
  await expect(dialog.getByRole('img', { name: 'Recorte 4:5 de la foto' })).toBeVisible();
  await dialog.getByLabel('Texto alternativo').fill('Balón rojo de prueba');
  await dialog.getByRole('button', { name: 'Subir foto' }).click();

  await expect(page.getByText(/Foto agregada\./)).toBeVisible({ timeout: 20_000 });
  expect(state.signed).toMatchObject({
    scope: 'product',
    ownerId: PRODUCT_ID,
    widths: [320, 640, 1024, 1600],
    contentType: 'image/webp',
  });
  expect(state.puts).toHaveLength(4);
  for (const put of state.puts) {
    expect(put.type).toBe('image/webp');
    expect(put.cache).toBe('public, max-age=31536000, immutable');
    // RIFF....WEBP: a real WebP file, whatever the browser.
    expect(put.head.slice(0, 4)).toBe('RIFF');
    expect(put.head.slice(8, 12)).toBe('WEBP');
  }
  expect(state.added).toMatchObject({
    product_id: PRODUCT_ID,
    width: 1200,
    height: 1500,
    alt: 'Balón rojo de prueba',
  });

  // The photo is now the cover, and the preview shows it in the public page.
  await expect(page.getByText('Portada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver vista previa' }).click();
  const preview = page.getByRole('region', { name: 'Vista previa de la ficha' });
  await expect(preview.getByRole('heading', { level: 1, name: 'Balón T45' })).toBeVisible();
  await expect(preview.getByRole('img', { name: 'Balón rojo de prueba' }).first()).toHaveAttribute(
    'src',
    new RegExp(`/p/${PRODUCT_ID}/${String(state.added?.image_id)}-\\d+\\.webp`),
  );
});

// A real iPhone HEIC (HEVC) is converted by heic-to; sharp can only write HEIF with AV1, which
// heic-to cannot decode. So this checks the other half: a HEIC that cannot be converted gives a
// clear message instead of leaving the panel waiting.
test('a HEIC photo that cannot be converted is explained', async ({ page }) => {
  // The conversion has a time limit (HEIC_TIMEOUT_MS); the alert must come before it.
  test.setTimeout(60_000);
  await stubSupabase(page, { role: 'editor', full_name: 'Beto Ruiz', is_active: true });
  const state = await stubPhotos(page);
  // HEIF with the "heic" brand: Chromium refuses it, as it refuses an iPhone photo, so
  // decodePhoto goes to heic-to.
  const heif = Buffer.from(
    await sharp({
      create: { width: 800, height: 1000, channels: 3, background: { r: 15, g: 28, b: 46 } },
    })
      .heif({ compression: 'av1' })
      .toBuffer(),
  );
  const ftypSize = heif.readUInt32BE(0);
  for (let i = 8; i < ftypSize; i += 4) {
    if (heif.subarray(i, i + 4).toString('latin1') === 'avif') heif.write('heic', i, 'latin1');
  }

  await page.goto('/admin/login');
  await logIn(page);
  await page.goto(`/admin/productos/editar?id=${PRODUCT_ID}`);
  await page.locator('input[type="file"]').setInputFiles({
    name: 'IMG_0002.HEIC',
    mimeType: 'image/heic',
    buffer: heif,
  });
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'IMG_0002.HEIC: No pudimos convertir esa foto HEIC.' }),
  ).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.puts).toHaveLength(0);
});
