import type { ReactNode } from 'react';
import { GoogleAnalytics, WhatsAppClickTracker } from '@/components/analytics/Analytics';
import { gaMeasurementId } from '@/lib/analytics/events';
import { SiteFooter, SiteHeader, WhatsAppFab } from '@/components/layout';
import { AddedNotice } from '@/components/quote/AddedNotice';
import { QuoteBar } from '@/components/quote/QuoteBar';
import { CommerceProvider } from '@/lib/commerce';
import { getBuildData } from '@/lib/data';
import { buildSiteNav } from '@/lib/navigation';

/** Public pages: header, footer and floating WhatsApp button around every page (T2.2). */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { catalog, settings } = await getBuildData();
  const nav = buildSiteNav(catalog, settings);
  return (
    <CommerceProvider flags={settings.flags}>
      <a
        href="#contenido"
        className="bg-lima text-noche type-body-strong sr-only z-50 px-4 py-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>
      <SiteHeader nav={nav} />
      <main id="contenido" className="pt-16 lg:pt-[72px]">
        {children}
      </main>
      <SiteFooter nav={nav} />
      <QuoteBar />
      <WhatsAppFab href={nav.contact.whatsappUrl} />
      <AddedNotice />
      <WhatsAppClickTracker />
      {/* DebugView shows the events of local and staging builds; deploy.yml sets no SITE_ENV. */}
      <GoogleAnalytics
        gaId={gaMeasurementId(process.env.NEXT_PUBLIC_GA_ID)}
        debug={!!process.env.SITE_ENV && process.env.SITE_ENV !== 'production'}
      />
    </CommerceProvider>
  );
}
