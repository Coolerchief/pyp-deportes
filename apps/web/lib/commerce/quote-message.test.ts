import {
  buildQuoteMessage,
  type CatalogJson,
  type QuoteLine,
  type QuoteRequester,
} from '@pyp/shared';
import { describe, expect, it } from 'vitest';
import { quoteMessageInput } from './quote-message';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const line = (n: number, productId: number, name: string, label: string | null, quantity: number) =>
  ({
    lineId: `l${n}`,
    productId: uuid(productId),
    variantId: uuid(100 + n),
    quantity,
    personalize: false,
    notes: '',
    snapshot: {
      name,
      sku: `P-${productId}`,
      slug: `p-${productId}`,
      variantLabel: label,
      image: null,
    },
    addedAt: '2026-10-14T00:00:00.000Z',
  }) satisfies QuoteLine;

const requester: QuoteRequester = {
  customer: {
    name: 'Ana López',
    phone: '5512345678',
    type: 'school_academy',
    organization: 'Academia Sur',
  },
  neededBy: '2026-10-21',
  deliveryMethod: 'pickup',
  requiresInvoice: false,
  note: '',
  privacyAccepted: true,
  privacyVersion: '2026-10',
};

describe('quoteMessageInput', () => {
  it('groups the list by product and uses each variant SKU from the catalog', () => {
    const lines = [
      line(1, 1, 'Uniforme', 'CH', 3),
      line(2, 1, 'Uniforme', 'M', 6),
      line(3, 2, 'Balón', '5 · Blanco/Rojo', 12),
    ];
    const catalog = {
      products: [
        {
          id: uuid(2),
          variants: [{ id: uuid(103), sku: 'BAL-5-BLANCO-ROJO', o1: '5', o2: 'Blanco/Rojo' }],
        },
      ],
    } as unknown as CatalogJson;
    const message = buildQuoteMessage(
      quoteMessageInput(lines, requester, 'PYP-2026-000001', catalog),
    );
    expect(message).toContain('*Cliente:* Ana López · Escuela o academia');
    expect(message).toContain('1. Uniforme (P-1) — 9 pzs\n   CH 3 · M 6');
    expect(message).toContain('2. Balón 5 Blanco/Rojo (BAL-5-BLANCO-ROJO) — 12 pzs');
  });

  it('falls back to the product SKU without the catalog', () => {
    const message = buildQuoteMessage(
      quoteMessageInput([line(3, 2, 'Balón', '#5', 1)], requester, null),
    );
    expect(message.startsWith('¡Hola! Quiero cotizar.\n')).toBe(true);
    expect(message).toContain('1. Balón #5 (P-2) — 1 pza');
  });
});
