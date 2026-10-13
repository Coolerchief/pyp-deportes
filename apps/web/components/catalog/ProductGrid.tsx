import type { CatalogProduct } from '@pyp/shared';
import { Fragment, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { VolumeNote } from './VolumeNote';

/** Cards before the volume note, as in the design: 2 rows of 2 on mobile, 2 rows of 3 on desktop. */
const NOTE_AFTER = { mobile: 4, desktop: 6 } as const;

const GRID = 'grid grid-cols-2 gap-x-3 gap-y-7 lg:gap-x-6 lg:gap-y-10';
const COLUMNS = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' } as const;

type ProductGridProps = {
  products: CatalogProduct[];
  /** Category slug → name, for the generic images. */
  categoryNames: Record<string, string>;
  newIds?: ReadonlySet<string>;
  /** Desktop columns: 3 next to the filter panel, 4 without it. */
  columns?: 3 | 4;
  /** Shows the volume note once inside the grid (listings). */
  volumeNoteUrl?: string;
  /** What to show with no products (empty catalog, filters without results). */
  empty: ReactNode;
  /** Cards whose images load eagerly (the first row). */
  priorityCount?: number;
};

/**
 * Grid of product cards (UI/UX §7.4): 2 columns on mobile, 3 or 4 on desktop, with the volume
 * note after the first rows. With no products it shows `empty` instead: production has an empty
 * catalog until phase 7 and the site must still build and read well.
 */
export function ProductGrid({
  products,
  categoryNames,
  newIds,
  columns = 3,
  volumeNoteUrl,
  empty,
  priorityCount = 2,
}: ProductGridProps) {
  if (products.length === 0) return <>{empty}</>;

  const note = (after: number, visibility: string) =>
    volumeNoteUrl ? (
      <li key={`note-${after}`} className={cx('col-span-full', visibility)}>
        <VolumeNote whatsappUrl={volumeNoteUrl} />
      </li>
    ) : null;
  const mobileAt = Math.min(NOTE_AFTER.mobile, products.length);
  const desktopAt = Math.min(NOTE_AFTER.desktop, products.length);

  return (
    <ul className={cx(GRID, COLUMNS[columns])}>
      {products.map((product, index) => (
        <Fragment key={product.id}>
          <li>
            <ProductCard
              product={product}
              categoryName={categoryNames[product.category] ?? product.category}
              isNew={newIds?.has(product.id)}
              priority={index < priorityCount}
            />
          </li>
          {index + 1 === mobileAt && note(mobileAt, 'lg:hidden')}
          {index + 1 === desktopAt && note(desktopAt, 'hidden lg:block')}
        </Fragment>
      ))}
    </ul>
  );
}

/** Loading grid (`catalogo-cargando`): skeleton cards with the same layout. */
export function ProductGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 3 | 4;
}) {
  return (
    <ul aria-hidden="true" className={cx(GRID, COLUMNS[columns])}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
