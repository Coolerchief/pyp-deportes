'use client';

import { type AnalyticsEvent, type AnalyticsEvents, GA4_ALIASES } from './events';

export * from './events';

/** Every tracked event is also announced on window under this name (debugging and E2E). */
export const TRACK_EVENT = 'pyp:track';

type Gtag = (command: 'event', name: string, params: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export type TrackDetail = { event: AnalyticsEvent; params: Record<string, unknown> };

/**
 * Sends an event to GA4 (TRD §12) and, for events with a GA4 equivalent, that one too. Without
 * a measurement ID (no gtag on the page) it only announces it. Never throws: analytics must
 * not break a page.
 */
export function track<E extends AnalyticsEvent>(event: E, params: AnalyticsEvents[E]): void {
  if (typeof window === 'undefined') return;
  const data = params as Record<string, unknown>;
  try {
    window.dispatchEvent(
      new CustomEvent<TrackDetail>(TRACK_EVENT, { detail: { event, params: data } }),
    );
    const gtag = window.gtag;
    if (!gtag) return;
    gtag('event', event, data);
    const alias = GA4_ALIASES[event];
    if (alias) gtag('event', alias, data);
  } catch {
    // Blocked or broken analytics: nothing to do.
  }
}
