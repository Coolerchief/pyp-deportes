import { describe, expect, it } from 'vitest';
import {
  centsToPesos,
  CommerceFormSchema,
  commercePayload,
  EMPTY_PRODUCT_FORM,
  parseTags,
  ProductFormSchema,
  type ProductFormInput,
  productPayload,
  pesosToCents,
  proposeSlug,
} from './admin-product.ts';

const valid: ProductFormInput = {
  ...EMPTY_PRODUCT_FORM,
  name: ' Balón de Fútbol No. 5 ',
  sku: 'bal-001',
  slug: 'balon-de-futbol-no-5',
  brandId: 'b1',
  categoryId: 'c1',
  sportIds: ['s1'],
  tags: 'cosido, escolar, cosido',
  specs: [
    { label: 'Material', value: 'Cuero sintético' },
    { label: '', value: '' },
  ],
  minSuggestedQty: '12',
};

const errors = (input: ProductFormInput) => {
  const result = ProductFormSchema.safeParse(input);
  return result.success
    ? {}
    : // The form shows the first message of each field, as zodResolver does.
      Object.fromEntries(result.error.issues.reverse().map((i) => [i.path.join('.'), i.message]));
};

describe('ProductFormSchema', () => {
  it('accepts a complete product and cleans it', () => {
    const values = ProductFormSchema.parse(valid);
    expect(values.name).toBe('Balón de Fútbol No. 5');
    expect(values.sku).toBe('BAL-001');
  });

  it('explains every missing or wrong field', () => {
    expect(errors(EMPTY_PRODUCT_FORM)).toEqual({
      name: 'Escribe el nombre.',
      sku: 'Escribe el SKU.',
      slug: 'Escribe la dirección.',
      brandId: 'Elige la marca.',
      categoryId: 'Elige la categoría.',
    });
    expect(errors({ ...valid, sku: 'BAL 001', slug: 'Balón-5', minSuggestedQty: '0' })).toEqual({
      sku: 'Usa letras, números y guiones, por ejemplo BAL-001.',
      slug: 'Usa minúsculas, números y guiones, sin espacios.',
      minSuggestedQty: 'Escribe un número de 1 a 9999 o déjalo vacío.',
    });
  });

  it('asks for a technique when the product can be customized', () => {
    expect(errors({ ...valid, isCustomizable: true })).toEqual({
      techniques: 'Elige al menos una técnica o quita "Se puede personalizar".',
    });
    expect(errors({ ...valid, isCustomizable: true, techniques: ['bordado'] })).toEqual({});
  });

  it('asks for both halves of a specification', () => {
    expect(errors({ ...valid, specs: [{ label: 'Tela', value: '' }] })).toEqual({
      'specs.0.value': 'Falta el valor.',
    });
  });
});

describe('productPayload', () => {
  it('builds what admin_save_product receives', () => {
    const values = ProductFormSchema.parse({ ...valid, techniques: ['vinil'] });
    expect(productPayload(values, { status: 'draft' })).toEqual({
      status: 'draft',
      sku: 'BAL-001',
      slug: 'balon-de-futbol-no-5',
      name: 'Balón de Fútbol No. 5',
      brandId: 'b1',
      categoryId: 'c1',
      subcategoryId: null,
      sportIds: ['s1'],
      audience: 'unisex',
      shortDescription: '',
      description: '',
      tags: ['cosido', 'escolar'],
      specs: [{ label: 'Material', value: 'Cuero sintético' }],
      isCustomizable: false,
      techniques: [],
      minSuggestedQty: 12,
      isFeatured: false,
    });
    expect(productPayload(values, { id: 'p1', status: 'published' })).toMatchObject({
      id: 'p1',
      status: 'published',
    });
  });

  it('proposes the address from the name', () => {
    expect(proposeSlug('Balón de Fútbol No. 5')).toBe('balon-de-futbol-no-5');
    expect(proposeSlug('  ¡Nuevo!  ')).toBe('nuevo');
    expect(parseTags(' , a ,b,a')).toEqual(['a', 'b']);
  });
});

describe('commerce', () => {
  it('reads amounts in pesos', () => {
    expect(pesosToCents('450')).toBe(45000);
    expect(pesosToCents('$1,200.5')).toBe(120050);
    expect(pesosToCents('0.99')).toBe(99);
    expect(pesosToCents('4.999')).toBeNull();
    expect(pesosToCents('')).toBeNull();
    expect(pesosToCents('-5')).toBeNull();
    expect(centsToPesos(120050)).toBe('1200.50');
    expect(centsToPesos(5)).toBe('0.05');
  });

  it('validates the tiers and builds the payload', () => {
    const form = {
      variants: [
        {
          variantId: 'v1',
          prices: [
            { minQty: '12', price: '399.90' },
            { minQty: '1', price: '450' },
          ],
          stock: [
            { storeId: 't1', quantity: '7' },
            { storeId: 't2', quantity: '' },
          ],
        },
      ],
    };
    expect(CommerceFormSchema.safeParse(form).success).toBe(true);
    expect(commercePayload(form)).toEqual([
      {
        variantId: 'v1',
        prices: [
          { minQty: 1, unitPriceCents: 45000 },
          { minQty: 12, unitPriceCents: 39990 },
        ],
        stock: [{ storeId: 't1', quantity: 7 }],
      },
    ]);
    const repeated = CommerceFormSchema.safeParse({
      variants: [
        {
          variantId: 'v1',
          prices: [
            { minQty: '1', price: '1' },
            { minQty: '01', price: 'x' },
          ],
          stock: [{ storeId: 't1', quantity: '-1' }],
        },
      ],
    });
    expect(repeated.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([
      ['variants.0.prices.1.price', 'Escribe un importe, por ejemplo 450.00.'],
      ['variants.0.prices.1.minQty', 'Ya hay un precio desde esa cantidad.'],
      ['variants.0.stock.0.quantity', 'Escribe 0 o más piezas.'],
    ]);
  });
});
