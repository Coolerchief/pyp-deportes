import { EMPTY_QUOTE, QUOTE_STORAGE_KEY, type QuoteAddition } from '@pyp/shared';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  catalogPricing,
  CommerceProvider,
  commerceModeOf,
  quoteCart,
  useCommerceMode,
  useQuote,
  useQuoteTotals,
} from '.';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const addition = (quantity = 3): QuoteAddition => ({
  productId: uuid(1),
  personalize: false,
  notes: '',
  product: { name: 'Balón', sku: 'BAL-001', slug: 'balon', image: null },
  variants: [{ variantId: uuid(2), label: '#5', quantity }],
});
const FLAGS = {
  showPrices: false,
  enableCheckout: false,
  enableShipping: false,
  enableStock: false,
};

const saved = () => JSON.parse(window.localStorage.getItem(QUOTE_STORAGE_KEY) ?? 'null');

/** Like opening the site again: an empty store in memory, the list still in localStorage. */
async function freshPageLoad() {
  const kept = window.localStorage.getItem(QUOTE_STORAGE_KEY);
  useQuote.setState({ ...EMPTY_QUOTE, hydrated: false }); // persist writes the empty list…
  if (kept) window.localStorage.setItem(QUOTE_STORAGE_KEY, kept); // …so put the saved one back
}

beforeEach(() => {
  window.localStorage.clear();
  useQuote.setState({ ...EMPTY_QUOTE, hydrated: false, storageAvailable: true });
});
afterEach(() => vi.restoreAllMocks());

describe('useQuote', () => {
  it('saves the list in localStorage under pyp.quote.v1 with its version', () => {
    act(() => void useQuote.getState().add(addition()));
    expect(saved()).toMatchObject({
      version: 1,
      state: { lines: [{ variantId: uuid(2), quantity: 3 }] },
    });
    expect(saved().state).not.toHaveProperty('hydrated');
  });

  it('reads the saved list back when the page runs', async () => {
    act(() => void useQuote.getState().add(addition(5)));
    await freshPageLoad();
    await act(() => useQuote.persist.rehydrate());
    expect(useQuote.getState().lines[0]?.quantity).toBe(5);
    expect(useQuote.getState().hydrated).toBe(true);
  });

  it('discards a list untouched for more than 30 days', async () => {
    window.localStorage.setItem(
      QUOTE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { lines: [], updatedAt: '2020-01-01T00:00:00.000Z' },
      }),
    );
    await act(() => useQuote.persist.rehydrate());
    expect(useQuote.getState().updatedAt).toBeNull();
  });

  it('removes with "Deshacer" and edits personalization through the store', () => {
    act(() => void useQuote.getState().add(addition()));
    const [line] = useQuote.getState().lines;
    let removed: ReturnType<ReturnType<typeof useQuote.getState>['remove']> = [];
    act(() => {
      removed = useQuote.getState().remove([line!.lineId]);
    });
    expect(useQuote.getState().lines).toEqual([]);
    act(() => useQuote.getState().undoRemove(removed));
    expect(useQuote.getState().lines).toHaveLength(1);
    act(() => useQuote.getState().setPersonalization(uuid(1), true, 'Escudo'));
    expect(useQuote.getState().lines[0]).toMatchObject({ personalize: true, notes: 'Escudo' });
  });

  it('keeps working in memory when the browser refuses storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    await act(() => useQuote.persist.rehydrate());
    expect(useQuote.getState().storageAvailable).toBe(false);
    act(() => void useQuote.getState().add(addition()));
    expect(useQuote.getState().lines).toHaveLength(1);
  });
});

describe('quoteCart (CartService)', () => {
  it('adds, updates, removes and clears through the store', () => {
    act(() => void quoteCart.add(addition(2)));
    const [line] = quoteCart.lines();
    act(() => quoteCart.update(line!.lineId, 8));
    expect(quoteCart.lines()[0]?.quantity).toBe(8);
    act(() => quoteCart.remove([line!.lineId]));
    expect(quoteCart.lines()).toEqual([]);
    act(() => void quoteCart.add(addition(1)));
    act(() => quoteCart.clear());
    expect(quoteCart.lines()).toEqual([]);
  });
});

describe('commerce mode and totals', () => {
  it('is a catalog until checkout is enabled, and prices are null', () => {
    expect(commerceModeOf(FLAGS)).toBe('catalog');
    expect(commerceModeOf({ ...FLAGS, enableCheckout: true })).toBe('store');
    expect(catalogPricing.priceFor(uuid(2), 10)).toBeNull();
  });

  it('gives the mode to components and reads the saved list on mount', async () => {
    act(() => void useQuote.getState().add(addition(4)));
    await freshPageLoad();
    function Probe() {
      const mode = useCommerceMode();
      const { pieces, hydrated } = useQuoteTotals();
      return <p>{`${mode} ${hydrated ? pieces : 'cargando'}`}</p>;
    }
    render(
      <CommerceProvider flags={FLAGS}>
        <Probe />
      </CommerceProvider>,
    );
    await waitFor(() => expect(screen.getByText('catalog 4')).toBeInTheDocument());
  });

  it('counts 0 pieces before the saved list is read', () => {
    useQuote.setState({ ...EMPTY_QUOTE, hydrated: false });
    const { result } = renderHook(() => useQuoteTotals());
    expect(result.current).toEqual({ pieces: 0, products: 0, hydrated: false });
  });
});
