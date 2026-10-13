import { type CatalogProduct, LISTING_PAGE_SIZE, productCount } from '@pyp/shared';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { DobleDiagonal, placaOffset } from '@/components/brand';
import { Breadcrumbs, type Crumb } from '@/components/layout/Breadcrumbs';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button, EmptyState } from '@/components/ui';
import { cx } from '@/lib/cx';
import { ProductGrid } from './ProductGrid';

export type ListingChip = { label: string; href: string; active: boolean };
export type ListingShortcut = { label: string; href: string };

type ListingPageProps = {
  breadcrumbs: Crumb[];
  title: string;
  /** Every product of the route, already sorted; the HTML carries the first 24. */
  products: CatalogProduct[];
  chips: ListingChip[];
  /** The two large shortcuts of a sport page. */
  shortcuts?: ListingShortcut[];
  categoryNames: Record<string, string>;
  newIds: ReadonlySet<string>;
  whatsappUrl: string;
};

const CHIP_HEIGHT = 36;

/** Chip that moves to another listing (UI/UX §7.2 look): outlined, or a noche plate when current. */
function LinkChip({ chip }: { chip: ListingChip }) {
  const offset = placaOffset(CHIP_HEIGHT);
  const style = (
    chip.active
      ? { height: CHIP_HEIGHT, '--placa-o': `${offset}px`, paddingInline: 12 + offset }
      : { height: CHIP_HEIGHT }
  ) as CSSProperties;
  return (
    <span className={cx('inline-flex shrink-0', chip.active && 'focus-placa')}>
      <Link
        href={chip.href}
        aria-current={chip.active ? 'page' : undefined}
        style={style}
        className={cx(
          'type-chip inline-flex items-center whitespace-nowrap no-underline',
          chip.active
            ? 'placa bg-noche text-blanco font-semibold'
            : 'border-borde-control bg-blanco text-noche rounded-sm border px-3',
        )}
      >
        {chip.label}
      </Link>
    </span>
  );
}

/**
 * Static listing (T2.4, UI/UX §8.2): breadcrumb, h1 with the product count, shortcuts on sport
 * pages, chips, and the first 24 products in the HTML. Filters, sorting and "Cargar más" run in
 * the browser from catalog.json (T2.5). With no products (production before phase 7) it shows
 * an empty state that sends to WhatsApp.
 */
export function ListingPage({
  breadcrumbs,
  title,
  products,
  chips,
  shortcuts = [],
  categoryNames,
  newIds,
  whatsappUrl,
}: ListingPageProps) {
  const firstBatch = products.slice(0, LISTING_PAGE_SIZE);
  return (
    <div className="container-page flex flex-col gap-4 pt-3 pb-16 lg:gap-7 lg:pt-5 lg:pb-20">
      <Breadcrumbs items={breadcrumbs} />
      <header className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-end lg:gap-6">
        <div className="flex flex-col gap-2.5 lg:col-span-6 lg:gap-3">
          <h1 className="font-display text-[44px] leading-[0.92] font-black break-words italic uppercase lg:text-[72px]">
            {title}
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
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0">
            {chips.map((chip) => (
              <li key={chip.href}>
                <LinkChip chip={chip} />
              </li>
            ))}
          </ul>
        </nav>
      )}
      <ProductGrid
        products={firstBatch}
        categoryNames={categoryNames}
        newIds={newIds}
        columns={4}
        volumeNoteUrl={whatsappUrl}
        priorityCount={2}
        empty={
          <EmptyState
            title="Pronto verás aquí nuestros productos"
            description="Estamos cargando el catálogo. Mientras, escríbenos y te decimos qué tenemos en tienda."
            action={
              <Button
                variant="whatsapp"
                href={whatsappUrl}
                external
                icon={<WhatsAppGlyph size={20} />}
              >
                Pregunta por WhatsApp
              </Button>
            }
          />
        }
      />
      {products.length > firstBatch.length && (
        <p className="type-small text-grafito-suave text-center">
          Mostrando {firstBatch.length} de {products.length}
        </p>
      )}
    </div>
  );
}
