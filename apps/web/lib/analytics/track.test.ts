import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analyticsItem,
  isWhatsAppHref,
  quoteItems,
  track,
  TRACK_EVENT,
  type TrackDetail,
} from './track';

afterEach(() => {
  delete window.gtag;
});

describe('GA4 items', () => {
  it('maps a product to items[] with the SKU as item_id', () => {
    expect(
      analyticsItem(
        { sku: 'BAL-005', name: 'Balón', brand: { name: 'Molten' } },
        { category: 'Balones', variant: '#5', quantity: 12, index: 0 },
      ),
    ).toEqual({
      item_id: 'BAL-005',
      item_name: 'Balón',
      item_brand: 'Molten',
      item_category: 'Balones',
      item_variant: '#5',
      quantity: 12,
      index: 0,
    });
    expect(analyticsItem({ sku: 'X', name: 'Y' }, { variant: null })).toEqual({
      item_id: 'X',
      item_name: 'Y',
    });
  });

  it('turns the quote lines into items, one per variant', () => {
    const snapshot = (variantLabel: string | null) => ({
      name: 'Uniforme',
      sku: 'UNI-1',
      variantLabel,
    });
    expect(
      quoteItems([
        { quantity: 3, snapshot: snapshot('CH') },
        { quantity: 6, snapshot: snapshot('M') },
      ]),
    ).toEqual([
      { item_id: 'UNI-1', item_name: 'Uniforme', item_variant: 'CH', quantity: 3 },
      { item_id: 'UNI-1', item_name: 'Uniforme', item_variant: 'M', quantity: 6 },
    ]);
  });

  it('recognizes WhatsApp links only', () => {
    expect(isWhatsAppHref('https://wa.me/525500000000?text=hola')).toBe(true);
    expect(isWhatsAppHref('https://api.whatsapp.com/send?phone=52')).toBe(true);
    expect(isWhatsAppHref('https://instagram.com/pyp')).toBe(false);
    expect(isWhatsAppHref(null)).toBe(false);
  });
});

describe('track', () => {
  it('announces every event, even without GA4', () => {
    const seen: TrackDetail[] = [];
    const listener = (e: Event) => seen.push((e as CustomEvent<TrackDetail>).detail);
    window.addEventListener(TRACK_EVENT, listener);
    track('search', { search_term: 'valon', results: 3 });
    window.removeEventListener(TRACK_EVENT, listener);
    expect(seen).toEqual([{ event: 'search', params: { search_term: 'valon', results: 3 } }]);
  });

  it('sends the event to gtag and its GA4 equivalent too', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const params = { items: [], products: 1, pieces: 2 };
    track('begin_quote_form', params);
    expect(gtag.mock.calls).toEqual([
      ['event', 'begin_quote_form', params],
      ['event', 'begin_checkout', params],
    ]);
    gtag.mockClear();
    track('whatsapp_click', { origin: 'floating' });
    expect(gtag.mock.calls).toEqual([['event', 'whatsapp_click', { origin: 'floating' }]]);
  });

  it('never throws when gtag breaks', () => {
    window.gtag = () => {
      throw new Error('blocked');
    };
    expect(() => track('view_quote', { items: [], products: 0, pieces: 0 })).not.toThrow();
  });
});
