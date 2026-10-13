import { featuredProducts, newProductIds, whatsappUrl } from '@pyp/shared';
import type { Metadata } from 'next';
import { CategoryTiles, ProductCard, SportTiles } from '@/components/catalog';
import { SitePhoto } from '@/components/content/SitePhoto';
import { AdvisorCard } from '@/components/home/AdvisorCard';
import { HomeHero } from '@/components/home/HomeHero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { StoreInfo } from '@/components/home/StoreInfo';
import { UniformsBand } from '@/components/home/UniformsBand';
import { SectionHeader } from '@/components/ui';
import { getBuildData } from '@/lib/data';
import { buildSiteNav, ROUTES } from '@/lib/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getBuildData();
  return {
    title: settings.siteName,
    description:
      'Uniformes a la medida y todo para entrenar. Precio especial para ligas, escuelas y equipos.',
  };
}

const SECTION = 'container-page flex flex-col gap-6 py-12 lg:gap-8 lg:py-20';

/**
 * Inicio (T2.8, UI/UX §8.1): hero, sports, uniforms band, featured products, volume and
 * advisor, teams, categories and the store. Sections without data (production before its
 * catalog is loaded) are left out instead of showing empty boxes.
 */
export default async function HomePage() {
  const { catalog, settings } = await getBuildData();
  const nav = buildSiteNav(catalog, settings);
  const quoteUrl = whatsappUrl(settings.whatsappSalesNumber, 'Hola, quiero cotizar.');
  const featured = featuredProducts(catalog.products);
  const newIds = newProductIds(catalog.products, catalog.generatedAt);
  const categoryNames = Object.fromEntries(catalog.categories.map((c) => [c.slug, c.name]));

  return (
    <>
      <HomeHero media={settings.siteMedia.home_hero} whatsappUrl={quoteUrl} />

      {nav.sports.length > 0 && (
        <section className={SECTION}>
          <SectionHeader eyebrow="Catálogo" title="Entra por tu deporte" diagonal />
          <SportTiles sports={nav.sports} />
        </section>
      )}

      <UniformsBand />

      {featured.length > 0 && (
        <section className={SECTION}>
          <SectionHeader eyebrow="Lo más pedido" title="Destacados" href={ROUTES.catalog} />
          <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
            {featured.map((product) => (
              <li key={product.id} className="w-[180px] shrink-0 snap-start lg:w-auto">
                <ProductCard
                  product={product}
                  categoryName={categoryNames[product.category] ?? product.category}
                  isNew={newIds.has(product.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-gis">
        <div className="container-page flex flex-col gap-8 py-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10 lg:py-20">
          <div className="flex flex-col gap-3 lg:col-span-4">
            <p className="type-eyebrow text-rojo-profundo">Para ligas y escuelas</p>
            <h2 className="type-h2">¿Compras para tu liga o escuela?</h2>
            <p className="type-body text-grafito">
              Te damos precio especial por volumen. Arma tu lista con las cantidades por talla y te
              cotizamos por WhatsApp.
            </p>
          </div>
          <div className="lg:col-span-5">
            <HowItWorks />
          </div>
          <div className="lg:col-span-3">
            <AdvisorCard
              advisor={settings.siteTexts.advisor}
              photo={settings.siteMedia.advisor}
              whatsappUrl={quoteUrl}
            />
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <SectionHeader
          eyebrow="Prueba social"
          title="Equipos estrenando"
          href={ROUTES.teams}
          linkLabel="Ver galería"
        />
        {/* The gallery arrives with /equipos (phase 5); until then, four photo placeholders. */}
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>
              <SitePhoto
                media={null}
                marker={'[FOTO DEL EQUIPO\ncon autorización]'}
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="aspect-[4/5]"
              />
            </li>
          ))}
        </ul>
      </section>

      {nav.categories.length > 0 && (
        <section className={`${SECTION} pt-0 lg:pt-0`}>
          <SectionHeader eyebrow="Todo el catálogo" title="Categorías" diagonal />
          <CategoryTiles categories={nav.categories} />
        </section>
      )}

      <StoreInfo store={settings.store} contact={nav.contact} />
    </>
  );
}
