import { EMPTY_PRODUCT_FORM } from '@pyp/shared';
import { describe, expect, it } from 'vitest';
import { buildPreview, type PreviewTaxonomy } from './preview';
import type { EditorProduct } from './products';

const ID = '0b6f0b6f-0000-4000-8000-000000000001';
const TAXONOMY: PreviewTaxonomy = {
  public_categories: [
    {
      id: 'c0000000-0000-4000-8000-000000000001',
      parent_id: null,
      slug: 'balones',
      name: 'Balones',
      size_label: 'Tamaño',
      sort_order: 0,
    },
  ],
  public_brands: [
    {
      id: 'b0000000-0000-4000-8000-000000000001',
      slug: 'molten',
      name: 'Molten',
      logo_key: null,
      is_own_brand: false,
      sort_order: 0,
    },
  ],
  public_sports: [
    { id: 'd0000000-0000-4000-8000-000000000001', slug: 'futbol', name: 'Fútbol', sort_order: 0 },
  ],
};

const PRODUCT: EditorProduct = {
  id: ID,
  status: 'draft',
  publishedAt: null,
  updatedAt: '2026-10-14T00:00:00Z',
  option1Name: 'Tamaño',
  option2Name: null,
  colorNote: null,
  photoCount: 2,
  images: [
    { id: 'i2', keyBase: `p/${ID}/i2`, alt: 'Portada', width: 1600, height: 2000 },
    { id: 'i1', keyBase: `p/${ID}/i1`, alt: '', width: 1600, height: 2000 },
  ],
  variants: [
    {
      id: 'f0000000-0000-4000-8000-000000000001',
      sku: 'BAL-001-4',
      option1: '4',
      option2: null,
      isDefault: false,
      prices: [],
      stock: [],
    },
    {
      id: 'f0000000-0000-4000-8000-000000000002',
      sku: 'BAL-001-5',
      option1: '5',
      option2: null,
      isDefault: false,
      prices: [],
      stock: [],
    },
  ],
  allVariants: [],
  form: {
    ...EMPTY_PRODUCT_FORM,
    name: 'Balón de Fútbol Molten',
    sku: 'BAL-001',
    slug: 'balon-de-futbol-molten',
    brandId: 'b0000000-0000-4000-8000-000000000001',
    categoryId: 'c0000000-0000-4000-8000-000000000001',
    sportIds: ['d0000000-0000-4000-8000-000000000001'],
    shortDescription: 'Para escuelas.',
    specs: [
      { label: 'Material', value: 'Sintético' },
      { label: '', value: '' },
    ],
  },
};

describe('buildPreview', () => {
  it('builds the public page of a draft with its photos in order', () => {
    const preview = buildPreview(PRODUCT, TAXONOMY, new Date('2026-10-14T12:00:00Z'));
    if (!preview.ok) throw new Error('sin vista previa');
    const { data } = preview;
    expect(data.product.name).toBe('Balón de Fútbol Molten');
    expect(data.product.brand.name).toBe('Molten');
    expect(data.categoryName).toBe('Balones');
    expect(data.images.map((i) => i.keyBase)).toEqual([`p/${ID}/i2`, `p/${ID}/i1`]);
    // Photos without alt text use the product name, as on the site.
    expect(data.images[1]?.alt).toBe('Balón de Fútbol Molten');
    expect(data.product.variants.map((v) => v.o1)).toEqual(['4', '5']);
    expect(data.specs).toContainEqual({ label: 'Material', value: 'Sintético' });
    expect(data.sports).toEqual([{ href: '/deporte/futbol', label: 'Fútbol' }]);
    expect(data.shortDescription).toBe('Para escuelas.');
  });

  it('says why when its brand or category is not public', () => {
    expect(
      buildPreview({ ...PRODUCT, form: { ...PRODUCT.form, brandId: 'otra' } }, TAXONOMY),
    ).toEqual({
      ok: false,
      reason: 'missing_brand',
    });
    expect(
      buildPreview({ ...PRODUCT, form: { ...PRODUCT.form, categoryId: 'otra' } }, TAXONOMY),
    ).toEqual({ ok: false, reason: 'missing_category' });
    // Anything the build would reject is reported instead of breaking the editor.
    const broken = { ...PRODUCT, variants: [{ ...PRODUCT.variants[0]!, id: 'no-uuid' }] };
    expect(buildPreview(broken, TAXONOMY)).toEqual({ ok: false, reason: 'invalid' });
  });
});
