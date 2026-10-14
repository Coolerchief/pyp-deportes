'use client';

import {
  categoriesIn,
  LISTING_PAGE_SIZE,
  newProductIds,
  productCount,
  SEARCH_SORT_OPTIONS,
  whatsappUrl,
} from '@pyp/shared';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button } from '@/components/ui';
import { useRememberListing } from '@/lib/commerce/added-notice';
import { serializeCounts } from '@/lib/facets';
import type { NavLink } from '@/lib/navigation';
import { searchHref, useCatalogSearch } from '@/lib/search-client';
import { CHIP_ROW, chipStyle } from './chip-style';
import { ListingResults } from './ListingResults';
import { ProductGridSkeleton } from './ProductGrid';
import { CategoryTiles, SportTiles } from './Tiles';

const SEARCH_SORTS = { options: SEARCH_SORT_OPTIONS, default: 'relevancia' } as const;
const NO_COUNTS = serializeCounts({
  deporte: new Map(),
  categoria: new Map(),
  marca: new Map(),
  para: new Map(),
  personalizable: 0,
});

type SearchPageProps = {
  sports: NavLink[];
  categories: NavLink[];
  whatsappNumber: string;
};

const BREADCRUMBS = [{ label: 'Inicio', href: '/' }, { label: 'Búsqueda' }];

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-[36px] leading-[0.95] font-black break-words italic uppercase lg:text-[56px]">
      {children}
    </h1>
  );
}

/** "¿No encuentras lo que buscas?" closing block (UI/UX §10), with the search in the message. */
function AskOnWhatsApp({ href }: { href: string }) {
  return (
    <section className="bg-gis flex flex-col gap-3 px-4 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="flex flex-col gap-1.5">
        <h2 className="type-h3">¿No encuentras lo que buscas?</h2>
        <p className="type-body text-grafito">Escríbenos y te decimos si lo tenemos en tienda.</p>
      </div>
      <Button variant="whatsapp" href={href} external icon={<WhatsAppGlyph size={20} />}>
        Pregunta por WhatsApp
      </Button>
    </section>
  );
}

/**
 * /buscar (APP-FLOW §3.3): results by relevance with category chips, filters and order as in a
 * listing; "¿Quisiste decir…?" when a word is misspelled; without results, shortcuts by sport
 * and category; without a query, the sports. Everything runs on catalog.json in the browser.
 */
export function SearchPage({ sports, categories, whatsappNumber }: SearchPageProps) {
  const q = useSearchParams().get('q')?.trim() ?? '';
  useRememberListing();
  const { catalog, api, search, status, retry } = useCatalogSearch(true);

  const results = useMemo(
    () => (api && search ? api.searchProducts(search, q) : null),
    [api, search, q],
  );
  const suggestion = useMemo(
    () => (api && search ? api.suggestCorrection(search, q) : null),
    [api, search, q],
  );
  const ask = whatsappUrl(whatsappNumber, `Hola, busco "${q}" y no lo encontré en el catálogo.`);

  const suggestionLine = suggestion && (
    <p className="type-body-lg">
      ¿Quisiste decir{' '}
      <Link href={searchHref(suggestion)} className="text-rojo-profundo font-semibold">
        {suggestion}
      </Link>
      ?
    </p>
  );

  if (!q) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <Heading>Busca en el catálogo</Heading>
        {sports.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="type-h3">Entra por tu deporte</h2>
            <SportTiles sports={sports} />
          </section>
        )}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <Heading>Resultados para “{q}”</Heading>
        <div role="alert" className="bg-gis flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <p className="type-body grow">
            No pudimos cargar todos los productos. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={retry}>
              Reintentar
            </Button>
            <Button
              variant="whatsapp"
              size="sm"
              href={ask}
              external
              icon={<WhatsAppGlyph size={18} />}
            >
              Pregunta por WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!results || !catalog) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Breadcrumbs items={BREADCRUMBS} />
        <Heading>Resultados para “{q}”</Heading>
        <p className="type-body text-grafito">Cargando…</p>
        <ProductGridSkeleton count={6} columns={4} />
        <p role="status" className="type-small text-grafito-suave text-center">
          Cargando productos…
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <Breadcrumbs items={BREADCRUMBS} />
        <section className="flex flex-col gap-3">
          <Heading>Sin resultados para “{q}”</Heading>
          <p className="type-body text-grafito">
            Revisa cómo está escrito o busca por deporte, categoría o marca.
          </p>
          {suggestionLine}
        </section>
        {sports.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="type-h3">Entra por tu deporte</h2>
            <ul className={CHIP_ROW}>
              {sports.map((sport) => {
                const { className, style } = chipStyle(false);
                return (
                  <li key={sport.href} className="inline-flex shrink-0">
                    <Link href={sport.href} className={className} style={style}>
                      {sport.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {categories.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="type-h3">O por categoría</h2>
            <CategoryTiles categories={categories} />
          </section>
        )}
        <AskOnWhatsApp href={ask} />
      </div>
    );
  }

  const names = <T extends { slug: string; name: string }>(rows: T[]) =>
    Object.fromEntries(rows.map((row) => [row.slug, row.name]));
  return (
    <div className="flex flex-col gap-4 lg:gap-7">
      <Breadcrumbs items={BREADCRUMBS} />
      <header className="flex flex-col gap-2">
        <Heading>Resultados para “{q}”</Heading>
        <p className="text-grafito text-base lg:text-lg">{productCount(results.length)}</p>
        {suggestionLine}
      </header>
      <ListingResults
        key={q}
        scope={{ kind: 'all' }}
        basePath={searchHref(q)}
        title={q}
        total={results.length}
        initialProducts={results.slice(0, LISTING_PAGE_SIZE)}
        sourceProducts={results}
        sorts={SEARCH_SORTS}
        scopeCounts={NO_COUNTS}
        labels={{
          deporte: names(catalog.sports),
          categoria: names(catalog.categories),
          marca: names(catalog.brands),
        }}
        categoryNames={names(catalog.categories)}
        newIds={[...newProductIds(catalog.products, catalog.generatedAt)]}
        tabs={[
          { label: 'Todo', category: null },
          ...categoriesIn(catalog, results).map((c) => ({ label: c.name, category: c.slug })),
        ]}
        whatsappUrl={ask}
      />
      <AskOnWhatsApp href={ask} />
    </div>
  );
}
