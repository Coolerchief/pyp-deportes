import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchPage } from '@/components/catalog/SearchPage';
import { getBuildData } from '@/lib/data';
import { buildSiteNav } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getBuildData();
  return { title: `Búsqueda · ${settings.siteName}` };
}

/** /buscar?q=… (T2.6): a static shell; the search runs in the browser on catalog.json. */
export default async function BuscarPage() {
  const { catalog, settings } = await getBuildData();
  const nav = buildSiteNav(catalog, settings);
  return (
    <div className="container-page pt-3 pb-16 lg:pt-5 lg:pb-20">
      {/* useSearchParams suspends while prerendering; the shell shows nothing until it runs. */}
      <Suspense>
        <SearchPage
          sports={nav.sports}
          categories={nav.categories}
          whatsappNumber={settings.whatsappSalesNumber}
        />
      </Suspense>
    </div>
  );
}
