import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { DobleDiagonal, logoSrc } from '@/components/brand';
import type { NavLink } from '@/lib/navigation';

/**
 * Sport tile (UI/UX §7.4): 4:5 generic image (PatronCancha and the monogram; sports have no
 * photo) with a noche gradient and the sport's name. Never a product count.
 */
export function SportTile({ link }: { link: NavLink }) {
  return (
    <Link href={link.href} className="text-blanco relative block no-underline">
      <div className="cancha bg-noche flex aspect-[4/5] items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, sized by percentage */}
        <img src={logoSrc('monograma', 'mono-blanco')} alt="" className="w-[30%]" />
      </div>
      <div className="from-noche/0 to-noche/92 absolute inset-x-0 bottom-0 bg-linear-to-b px-2.5 pt-8 pb-2.5 lg:px-3 lg:pt-10 lg:pb-3">
        <h3 className="type-h3 break-words">{link.label}</h3>
      </div>
    </Link>
  );
}

/** "Entra por tu deporte": a snap carousel on mobile, 7 columns on desktop. */
export function SportTiles({ sports }: { sports: NavLink[] }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-7 lg:gap-4 lg:overflow-visible lg:px-0">
      {sports.map((sport) => (
        <li key={sport.href} className="w-[136px] shrink-0 snap-start lg:w-auto">
          <SportTile link={sport} />
        </li>
      ))}
    </ul>
  );
}

/** Category tile (UI/UX §7.4): PatronCancha block with the name and a lima mark. No count. */
export function CategoryTile({ link }: { link: NavLink }) {
  return (
    <Link
      href={link.href}
      className="cancha bg-noche text-blanco flex h-[72px] items-center justify-between gap-2 px-3 no-underline lg:h-24 lg:flex-col-reverse lg:items-start lg:justify-between lg:p-4"
    >
      <h3 className="font-display text-[18px] leading-none font-extrabold italic uppercase lg:text-[20px]">
        {link.label}
      </h3>
      <ChevronRight aria-hidden="true" className="text-lima size-5 shrink-0 lg:hidden" />
      <DobleDiagonal height={18} className="text-lima hidden lg:block" />
    </Link>
  );
}

/** "Categorías": 2 columns on mobile, 5 on desktop. */
export function CategoryTiles({ categories }: { categories: NavLink[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
      {categories.map((category) => (
        <li key={category.href}>
          <CategoryTile link={category} />
        </li>
      ))}
    </ul>
  );
}
