'use client';

import { isFolio } from '@pyp/shared';
import { create } from 'zustand';

/** sessionStorage key of the last send: reloading the confirmation shows it again. */
export const LAST_QUOTE_KEY = 'pyp.lastQuote.v1';

export type LastQuote = { folio: string | null; waUrl: string };

/** `?enviada=` value: the folio, or "1" when it went without folio (APP-FLOW §4.2). */
export const sentParam = (folio: string | null) => folio ?? '1';

export function saveLastQuote(last: LastQuote): void {
  try {
    window.sessionStorage.setItem(LAST_QUOTE_KEY, JSON.stringify(last));
  } catch {
    // Without storage the confirmation still shows now; a reload goes back to step 1.
  }
}

/** The saved send that matches `?enviada=`, or null (another session, or a typed URL). */
export function loadLastQuote(param: string): LastQuote | null {
  try {
    const raw = window.sessionStorage.getItem(LAST_QUOTE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<LastQuote>) : null;
    if (!saved || typeof saved.waUrl !== 'string' || !saved.waUrl.startsWith('https://wa.me/')) {
      return null;
    }
    const folio = typeof saved.folio === 'string' && isFolio(saved.folio) ? saved.folio : null;
    return sentParam(folio) === param ? { folio, waUrl: saved.waUrl } : null;
  } catch {
    return null;
  }
}

type SubmissionState = {
  /** Idempotency key: made on entering step 2, renewed only after a saved request. */
  clientRequestId: string | null;
  /** Variants the function rejected (409), marked on step 1 until removed. */
  rejectedVariantIds: string[];
  /** The confirmation of this visit, kept in memory too in case sessionStorage is blocked. */
  last: LastQuote | null;
  /** WhatsApp link to open once the confirmation is on screen (and in the history). */
  pendingOpen: string | null;
  ensureRequestId(): string;
  renewRequestId(): void;
  setRejected(variantIds: string[]): void;
  setLast(last: LastQuote, open?: boolean): void;
  /** The pending link, once: a reload of the confirmation does not open WhatsApp again. */
  takePendingOpen(): string | null;
};

const newId = () => crypto.randomUUID();

export const useSubmission = create<SubmissionState>()((set, get) => ({
  clientRequestId: null,
  rejectedVariantIds: [],
  last: null,
  pendingOpen: null,
  ensureRequestId() {
    const current = get().clientRequestId;
    if (current) return current;
    const id = newId();
    set({ clientRequestId: id });
    return id;
  },
  renewRequestId() {
    set({ clientRequestId: newId() });
  },
  setRejected(variantIds) {
    set({ rejectedVariantIds: variantIds });
  },
  setLast(last, open = false) {
    saveLastQuote(last);
    set({ last, pendingOpen: open ? last.waUrl : null });
  },
  takePendingOpen() {
    const url = get().pendingOpen;
    if (url) set({ pendingOpen: null });
    return url;
  },
}));

/**
 * Opens the WhatsApp link right after the response (TRD §6.4), from the confirmation so it is
 * already in the history. If the browser blocks it, the confirmation's "Abrir WhatsApp" button
 * is the way. An object so tests can replace it.
 */
export const whatsappOpener = {
  open(url: string) {
    window.location.assign(url);
  },
};

export const openWhatsApp = (url: string) => whatsappOpener.open(url);
