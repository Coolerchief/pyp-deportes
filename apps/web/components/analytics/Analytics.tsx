'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import {
  type AnalyticsEvent,
  type AnalyticsEvents,
  isWhatsAppHref,
  track,
  type WhatsAppOrigin,
} from '@/lib/analytics/track';

/**
 * GA4 (TRD §12) with next/script after the page is interactive. Page changes inside the site
 * are counted by GA4's enhanced measurement (history events). `debug` sends debug_mode so the
 * events show in DebugView (every environment but production).
 */
export function GoogleAnalytics({ gaId, debug }: { gaId: string | null; debug: boolean }) {
  if (!gaId) return null;
  const config = JSON.stringify(debug ? { debug_mode: true } : {});
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag('js',new Date());gtag('config','${gaId}',${config});`}
      </Script>
    </>
  );
}

/**
 * Every WhatsApp exit (APP-FLOW §6) with one listener: a click on a wa.me link sends
 * whatsapp_click with the origin of the nearest `data-wa-origin`, so server components only
 * mark their section.
 */
export function WhatsAppClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest('a');
      if (!link || !isWhatsAppHref(link.getAttribute('href'))) return;
      const marked = link.closest<HTMLElement>('[data-wa-origin]');
      const origin = (marked?.dataset.waOrigin as WhatsAppOrigin | undefined) ?? 'other';
      track('whatsapp_click', { origin });
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return null;
}

/** Sends an event once when it mounts (view_item, …) from a server component. */
export function TrackOnMount<E extends AnalyticsEvent>({
  event,
  params,
}: {
  event: E;
  params: AnalyticsEvents[E];
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(event, params);
  }, [event, params]);
  return null;
}
