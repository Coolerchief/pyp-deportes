'use client';

import { quoteTotals, type SettingsJson } from '@pyp/shared';
import { createContext, type ReactNode, useContext, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useQuote } from './quote-store';
import type { CommerceMode, PricingService } from './types';

export { quoteCart, useQuote } from './quote-store';
export type * from './types';

const ModeContext = createContext<CommerceMode>('catalog');

/** 'store' only when checkout is enabled in settings; everything else stays a catalog. */
export function commerceModeOf(flags: SettingsJson['flags']): CommerceMode {
  return flags.enableCheckout ? 'store' : 'catalog';
}

/**
 * Commerce mode for the public site plus reading the saved quote list once the page runs.
 * Components never read the flags themselves (TRD §19.1): they call useCommerceMode().
 */
export function CommerceProvider({
  flags,
  children,
}: {
  flags: SettingsJson['flags'];
  children: ReactNode;
}) {
  useEffect(() => {
    void useQuote.persist.rehydrate();
  }, []);
  return <ModeContext.Provider value={commerceModeOf(flags)}>{children}</ModeContext.Provider>;
}

export function useCommerceMode(): CommerceMode {
  return useContext(ModeContext);
}

/** Pieces and products in the list; 0 until the saved list was read. */
export function useQuoteTotals(): { pieces: number; products: number; hydrated: boolean } {
  const { lines, hydrated } = useQuote(
    useShallow((s) => ({ lines: s.lines, hydrated: s.hydrated })),
  );
  return { ...quoteTotals(hydrated ? lines : []), hydrated };
}

/** PricingService of the catalog: no prices while show_prices is off. */
export const catalogPricing: PricingService = {
  priceFor: () => null,
};
