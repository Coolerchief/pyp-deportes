import { type CatalogProduct, LISTING_PAGE_SIZE, productCount } from '@pyp/shared';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { DobleDiagonal } from '@/components/brand';
import { Breadcrumbs, type Crumb } from '@/components/layout/Breadcrumbs';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button, EmptyState } from '@/components/ui';
import { CHIP_ROW, chipStyle } from './chip-style';
import { ListingResults, type ListingResultsProps, ListingResultsStatic } from './ListingResults';

export type ListingChip = { label: string; href: string; active: boolean };
export type ListingShortcut = { label: string; href: string };

type ListingPageProps = Omit<ListingResultsProps, 'total' | 'initialProducts'> & {
  breadcrumbs: Crumb[];
  /** Every product of the route, already sorted; the HTML carries the first 24. */
  products: CatalogProduct[];
  /** Chips that lead to other routes (catalog → categories, category → subcategories). */
  chips: ListingChip[];
  /** The two large shortcuts of a sport page. */
  shortcuts?: ListingShortcut[];
};

/** Chip that moves to another listing route. */
function LinkChip({ chip }: { chip: ListingChip }) {
  const { className, style } = chipStyle(chip.active);
  return (
    <span className={chip.active ? 'focus-placa inline-flex shrink-0' : 'inline-flex shrink-0'}>
      <Link
        href={chip.href}
        aria-current={chip.active ? 'page' : undefined}
        style={style}
        className={className}
      >
        {chip.label}
      </Link>
    </span>
  );
}

/**
 * Listing page (T2.4–T2.5, UI/UX §8.2). The header, route chips and first 24 products are in
 * the static HTML; filters, order and "Cargar más" read the URL and catalog.json in the browser
 * (ListingResults). With no products (production before phase 7) it shows an empty state that
 * sends to WhatsApp.
 */
export function ListingPage({
  breadcrumbs,
  products,
  chips,
  shortcuts = [],
  ...results
}: ListingPageProps) {
  const resultsProps: ListingResultsProps = {
    ...results,
    total: products.length,
    initialProducts: products.slice(0, LISTING_PAGE_SIZE),
  };
  return (
    <div className="container-page flex flex-col gap-4 pt-3 pb-16 lg:gap-7 lg:pt-5 lg:pb-20">
      <Breadcrumbs items={breadcrumbs} />
      <header className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-end lg:gap-6">
        <div className="flex flex-col gap-2.5 lg:col-span-6 lg:gap-3">
          <h1 className="font-display text-[44px] leading-[0.92] font-black break-words italic uppercase lg:text-[72px]">
            {results.title}
          </h1>
          <p className="text-grafito text-base leading-[1.45] lg:text-lg">
            {productCount(products.length)}
          </p>
        </div>
        {shortcuts.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 lg:col-span-6 lg:gap-6">
            {shortcuts.map((shortcut) => (
              <li key={shortcut.href}>
                <Link
                  href={shortcut.href}
                  className="cancha bg-noche text-blanco flex h-[104px] flex-col justify-between p-3 no-underline lg:h-[132px] lg:p-[18px]"
                >
                  <DobleDiagonal height={22} className="text-lima" />
                  <span className="font-display flex items-center justify-between gap-2 text-[20px] leading-none font-extrabold italic uppercase lg:text-[26px]">
                    {shortcut.label}
                    <ChevronRight
                      aria-hidden="true"
                      className="text-lima hidden size-6 shrink-0 lg:block"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>
      {chips.length > 1 && (
        <nav aria-label="Categorías del listado">
          <ul className={CHIP_ROW}>
            {chips.map((chip) => (
              <li key={chip.href}>
                <LinkChip chip={chip} />
              </li>
            ))}
          </ul>
        </nav>
      )}
      {products.length === 0 ? (
        <EmptyState
          title="Pronto verás aquí nuestros productos"
          description="Estamos cargando el catálogo. Mientras, escríbenos y te decimos qué tenemos en tienda."
          action={
            <Button
              variant="whatsapp"
              href={results.whatsappUrl}
              external
              icon={<WhatsAppGlyph size={20} />}
            >
              Pregunta por WhatsApp
            </Button>
          }
        />
      ) : (
        // useSearchParams suspends while prerendering: the fallback is the static first batch.
        <Suspense fallback={<ListingResultsStatic {...resultsProps} />}>
          <ListingResults {...resultsProps} />
        </Suspense>
      )}
    </div>
  );
}
