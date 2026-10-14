'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { create } from 'zustand';

// The "added to your quote" notice (T3.3, UI/UX §7.6) is opened from the product page and from
// the cards' "+ Cotizar"; one AddedNotice in the public layout shows it.

export type AddedNoticeData = {
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    categoryName: string;
    image: { keyBase: string; alt: string } | null;
  };
  personalize: boolean;
  /** What was just added, per variant ("CH × 3"); label null for the default variant. */
  lines: { label: string | null; quantity: number }[];
  /** Variants left out because the list hit 100 lines. */
  skipped: number;
};

type AddedNoticeStore = {
  notice: AddedNoticeData | null;
  /** The element that triggered it, to give focus back on close. */
  opener: HTMLElement | null;
  /** Last listing visited (path + query), for "Seguir viendo el catálogo" (APP-FLOW §4.1). */
  lastListing: string | null;
  show(notice: AddedNoticeData): void;
  close(): void;
  rememberListing(href: string): void;
};

export const useAddedNotice = create<AddedNoticeStore>()((set) => ({
  notice: null,
  opener: null,
  lastListing: null,
  show: (notice) =>
    set({
      notice,
      opener: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    }),
  close: () => set({ notice: null }),
  rememberListing: (href) => set({ lastListing: href }),
}));

/** Listings and search results call this, so the notice can send the visitor back to them. */
export function useRememberListing() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => {
    useAddedNotice.getState().rememberListing(query ? `${pathname}?${query}` : pathname);
  }, [pathname, query]);
}
