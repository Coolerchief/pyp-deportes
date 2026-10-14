'use client';

import {
  addToQuote,
  EMPTY_QUOTE,
  type QuoteAddition,
  type QuoteLine,
  QUOTE_STORAGE_KEY,
  QUOTE_STORAGE_VERSION,
  type QuoteState,
  removeLines,
  restoreLines,
  restoreQuote,
  setPersonalization,
  setQuantity,
} from '@pyp/shared';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { CartService } from './types';

// The quote list (T3.1, TRD §6.3): a Zustand store saved in localStorage under pyp.quote.v1.
// The rules live in @pyp/shared (quote-list.ts); this file only wires them to the browser.

type Removed = ReturnType<typeof removeLines>['removed'];

export type QuoteStore = QuoteState & {
  /** false until the saved list was read: render 0 pieces before that, as the static HTML. */
  hydrated: boolean;
  /** false when the browser refuses storage (strict private mode): the list lives in memory. */
  storageAvailable: boolean;
  add(addition: QuoteAddition): { added: string[]; skipped: number };
  setQuantity(lineId: string, quantity: number): void;
  remove(lineIds: string[]): Removed;
  undoRemove(removed: Removed): void;
  setPersonalization(productId: string, personalize: boolean, notes: string): void;
  clear(): void;
};

const now = () => new Date().toISOString();
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Whether the browser lets the site write to localStorage right now. */
export function storageWorks(): boolean {
  try {
    const probe = '__pyp_probe__';
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * localStorage that never throws: every call falls back to memory when the browser refuses
 * storage (strict private mode, full quota), so the list keeps working during the visit.
 */
const memory = new Map<string, string>();
export const resilientStorage: StateStorage = {
  getItem(name) {
    try {
      return window.localStorage.getItem(name) ?? memory.get(name) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem(name, value) {
    memory.set(name, value);
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Kept in memory only; QuoteStore.storageAvailable tells the page to warn.
    }
  },
  removeItem(name) {
    memory.delete(name);
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Nothing to remove.
    }
  },
};

export const useQuote = create<QuoteStore>()(
  persist(
    (set, get) => ({
      ...EMPTY_QUOTE,
      hydrated: false,
      storageAvailable: true,
      add(addition) {
        const result = addToQuote(get(), addition, now(), newId);
        set(result.state);
        return { added: result.added, skipped: result.skipped };
      },
      setQuantity(lineId, quantity) {
        set(setQuantity(get(), lineId, quantity, now()));
      },
      remove(lineIds) {
        const { state, removed } = removeLines(get(), lineIds, now());
        set(state);
        return removed;
      },
      undoRemove(removed) {
        set(restoreLines(get(), removed, now()));
      },
      setPersonalization(productId, personalize, notes) {
        set(setPersonalization(get(), productId, personalize, notes, now()));
      },
      clear() {
        set({ lines: [], updatedAt: now() });
      },
    }),
    {
      name: QUOTE_STORAGE_KEY,
      version: QUOTE_STORAGE_VERSION,
      storage: createJSONStorage(() => resilientStorage),
      // Only the list is saved; flags and actions are not.
      partialize: ({ lines, updatedAt }) => ({ lines, updatedAt }),
      // Read in an effect (QuoteHydrator), never during the static render: no hydration mismatch.
      skipHydration: true,
      // Any older or unknown version, broken data or a list older than 30 days starts empty.
      migrate: (saved, version) => restoreQuote(saved, version, now()),
      merge: (saved, current) => ({
        ...current,
        ...restoreQuote(saved, QUOTE_STORAGE_VERSION, now()),
      }),
      onRehydrateStorage: () => () => {
        useQuote.setState({ hydrated: true, storageAvailable: storageWorks() });
      },
    },
  ),
);

/** CartService over the quote list (TRD §19.1). */
export const quoteCart: CartService = {
  lines: (): QuoteLine[] => useQuote.getState().lines,
  add: (addition) => useQuote.getState().add(addition),
  update: (lineId, quantity) => useQuote.getState().setQuantity(lineId, quantity),
  remove: (lineIds) => void useQuote.getState().remove(lineIds),
  clear: () => useQuote.getState().clear(),
};
