import type { Metadata } from 'next';
import { Suspense } from 'react';
import { QuotePage } from '@/components/quote/QuotePage';
import { getBuildData } from '@/lib/data';
import { buildSiteNav } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getBuildData();
  return { title: `Mi cotización · ${settings.siteName}` };
}

/** /cotizacion (T3.4): a static shell; the list lives in the visitor's browser. */
export default async function CotizacionPage() {
  const { catalog, settings } = await getBuildData();
  const nav = buildSiteNav(catalog, settings);
  return (
    <div className="container-page pt-4 pb-16 lg:pt-8 lg:pb-20">
      {/* useSearchParams (?paso=) suspends while prerendering. */}
      <Suspense>
        <QuotePage sports={nav.sports} />
      </Suspense>
    </div>
  );
}
