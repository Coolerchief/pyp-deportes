import { newProductIds } from '@pyp/shared';
import type { Metadata } from 'next';
import {
  CategoryTiles,
  ProductGrid,
  ProductGridSkeleton,
  SportTiles,
  VolumeNote,
} from '@/components/catalog';
import { Button, EmptyState } from '@/components/ui';
import { getBuildData } from '@/lib/data';
import { buildSiteNav, ROUTES } from '@/lib/navigation';

// Development-only sheet of the catalog components (T2.3), with the build data of pyp-dev.

export const metadata: Metadata = { title: 'Catálogo · desarrollo', robots: { index: false } };

export default async function CatalogoDevPage() {
  const { catalog, settings } = await getBuildData();
  const nav = buildSiteNav(catalog, settings);
  const categoryNames = Object.fromEntries(catalog.categories.map((c) => [c.slug, c.name]));
  const newIds = newProductIds(catalog.products, catalog.generatedAt);
  // A few cards with and without choices, customizable or not.
  const sample = [
    ...catalog.products.filter((p) => p.customizable).slice(0, 3),
    ...catalog.products.filter((p) => p.variants.length === 1).slice(0, 3),
    ...catalog.products.filter((p) => !p.customizable && p.variants.length > 1).slice(0, 2),
  ];
  // One card with a made-up R2 key to see the width loader's URLs (the file does not exist).
  const [first] = catalog.products;
  if (first)
    sample.push({
      ...first,
      id: `${first.id.slice(0, -4)}f070`,
      name: 'Con foto (URL de R2)',
      image: { keyBase: 'p/demo/foto', alt: 'Foto de muestra' },
    });

  return (
    <main className="container-page flex flex-col gap-12 py-12 lg:py-16">
      <div>
        <p className="type-eyebrow text-rojo-profundo">Desarrollo · T2.3</p>
        <h1 className="type-h1 mt-2">Componentes del catálogo</h1>
      </div>
      <section className="flex flex-col gap-4">
        <h2 className="type-h2">SportTiles</h2>
        <SportTiles sports={nav.sports} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="type-h2">CategoryTiles</h2>
        <CategoryTiles categories={nav.categories} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="type-h2">ProductGrid con VolumeNote</h2>
        <ProductGrid
          products={sample}
          categoryNames={categoryNames}
          newIds={newIds}
          volumeNoteUrl={nav.contact.whatsappUrl}
          empty={null}
        />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="type-h2">Cargando</h2>
        <ProductGridSkeleton count={3} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="type-h2">Sin productos</h2>
        <ProductGrid
          products={[]}
          categoryNames={categoryNames}
          empty={
            <EmptyState
              title="Pronto verás aquí nuestros productos"
              description="Estamos cargando el catálogo. Mientras, escríbenos y te decimos qué tenemos en tienda."
              action={
                <Button variant="whatsapp" href={nav.contact.whatsappUrl} external>
                  Pregunta por WhatsApp
                </Button>
              }
            />
          }
        />
        <VolumeNote whatsappUrl={nav.contact.whatsappUrl} />
        <p className="type-small text-grafito-suave">
          Enlaces de prueba: <a href={ROUTES.catalog}>{ROUTES.catalog}</a>
        </p>
      </section>
    </main>
  );
}
