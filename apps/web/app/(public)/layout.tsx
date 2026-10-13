import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader, WhatsAppFab } from '@/components/layout';
import { getBuildData } from '@/lib/data';
import { buildSiteNav } from '@/lib/navigation';

/** Public pages: header, footer and floating WhatsApp button around every page (T2.2). */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { catalog, settings } = await getBuildData();
  const nav = buildSiteNav(catalog, settings);
  return (
    <>
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
      <WhatsAppFab href={nav.contact.whatsappUrl} />
    </>
  );
}
