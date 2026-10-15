import { describe, expect, it } from 'vitest';
import { findProducts, matchPhotos, photoNameCandidates } from './bulk-photos';

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

describe('photoNameCandidates', () => {
  it('reads the SKU and the order from the file name', () => {
    // "-001" has three digits: it is part of the SKU, not a photo number.
    expect(photoNameCandidates('bal-001.jpg')).toEqual([{ sku: 'BAL-001', order: 1 }]);
    expect(photoNameCandidates('BAL-001-2.webp')).toEqual([
      { sku: 'BAL-001-2', order: 1 },
      { sku: 'BAL-001', order: 2 },
    ]);
    expect(photoNameCandidates('UNI-010_3.HEIC')).toEqual([
      { sku: 'UNI-010_3', order: 1 },
      { sku: 'UNI-010', order: 3 },
    ]);
    expect(photoNameCandidates('.jpg')).toEqual([]);
  });
});

describe('matchPhotos', () => {
  const products = new Map([
    ['BAL-001', { id: 'p1', sku: 'BAL-001', name: 'Balón' }],
    ['UNI-010', { id: 'p2', sku: 'UNI-010', name: 'Uniforme' }],
  ]);

  it('matches by the real SKUs and keeps the order of each product', () => {
    const { matched, unmatched } = matchPhotos(
      [file('UNI-010.jpg'), file('BAL-001-2.jpg'), file('bal-001.jpg'), file('XYZ.jpg')],
      products,
    );
    expect(matched.map((m) => [m.file.name, m.product.sku, m.order])).toEqual([
      ['bal-001.jpg', 'BAL-001', 1],
      ['BAL-001-2.jpg', 'BAL-001', 2],
      ['UNI-010.jpg', 'UNI-010', 1],
    ]);
    expect(unmatched.map((f) => f.name)).toEqual(['XYZ.jpg']);
  });
});

describe('findProducts', () => {
  it('looks up every candidate SKU in one query', async () => {
    let asked: string[] = [];
    const supabase = {
      from: () => ({
        select: () => ({
          in: async (_column: string, skus: string[]) => {
            asked = skus;
            return { data: [{ id: 'p1', sku: 'BAL-001', name: 'Balón' }], error: null };
          },
        }),
      }),
    };
    const found = await findProducts(supabase as never, [
      file('BAL-001-2.jpg'),
      file('BAL-001.jpg'),
    ]);
    expect(asked).toEqual(['BAL-001-2', 'BAL-001']);
    expect(found.get('BAL-001')?.id).toBe('p1');
  });
});
