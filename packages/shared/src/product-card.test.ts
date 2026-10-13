import { describe, expect, it } from 'vitest';
import { hasVariantChoice, newProductIds, productBadges } from './product-card';

const variant = (id: string) => ({ id, sku: id, o1: null, o2: null });

describe('hasVariantChoice', () => {
  it('is false for a product with a single variant', () => {
    expect(hasVariantChoice({ variants: [variant('a')] })).toBe(false);
    expect(hasVariantChoice({ variants: [variant('a'), variant('b')] })).toBe(true);
  });
});

describe('newProductIds', () => {
  const now = '2026-11-30T12:00:00.000Z';
  const product = (id: string, publishedAt: string) => ({ id, publishedAt });

  it('marks products published in the last 30 days', () => {
    const ids = newProductIds(
      [
        product('nuevo', '2026-11-20T00:00:00.000Z'),
        product('limite', '2026-10-31T12:00:00.000Z'),
        product('viejo', '2026-10-01T00:00:00.000Z'),
        product('viejo-2', '2026-09-01T00:00:00.000Z'),
        product('viejo-3', '2026-08-01T00:00:00.000Z'),
      ],
      now,
    );
    expect([...ids]).toEqual(['nuevo', 'limite']);
  });

  it('gives nobody the badge when most of the catalog is new (launch day)', () => {
    const ids = newProductIds(
      [
        product('a', '2026-11-29T00:00:00.000Z'),
        product('b', '2026-11-29T00:00:00.000Z'),
        product('c', '2026-01-01T00:00:00.000Z'),
      ],
      now,
    );
    expect(ids.size).toBe(0);
  });

  it('is empty for an empty catalog', () => {
    expect(newProductIds([], now).size).toBe(0);
  });
});

describe('productBadges', () => {
  it('puts "Nuevo" before "Personalizable", two at most', () => {
    expect(productBadges({ customizable: true }, true)).toEqual([
      { variant: 'new', label: 'Nuevo' },
      { variant: 'custom', label: 'Personalizable' },
    ]);
    expect(productBadges({ customizable: false }, false)).toEqual([]);
  });
});
