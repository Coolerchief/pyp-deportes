'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ROUTES, type SiteNav } from '@/lib/navigation';

const COLUMN_TITLE =
  'font-display border-noche mb-2 border-b-2 pb-2.5 text-[24px] leading-none font-extrabold italic uppercase';
const LINK = 'text-noche flex h-10 items-center font-medium no-underline hover:underline';

/**
 * Desktop mega menu (`menu`, escritorio): white panel under the header with Deportes,
 * Categorías in two columns and the "Uniformes a tu medida" card. Both header triggers open it.
 */
export function MegaMenu({
  id,
  nav,
  onNavigate,
}: {
  id: string;
  nav: SiteNav;
  onNavigate: () => void;
}) {
  return (
    <div
      id={id}
      role="region"
      aria-label="Menú del catálogo"
      className="bg-blanco text-noche shadow-float absolute inset-x-0 top-full"
    >
      <div className="container-page grid grid-cols-12 items-start gap-6 pt-10 pb-12">
        {nav.sports.length > 0 && (
          <section className="col-span-3 flex flex-col">
            <h2 className={COLUMN_TITLE}>Deportes</h2>
            <ul>
              {nav.sports.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK} onClick={onNavigate}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="col-span-5 flex flex-col">
          <h2 className={COLUMN_TITLE}>Categorías</h2>
          <ul className="grid grid-cols-2 gap-x-6">
            {/* Empty until products are published: only "Ver todo el catálogo" remains. */}
            {nav.categories.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK} onClick={onNavigate}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={ROUTES.catalog}
            className="text-rojo-profundo mt-2 inline-flex h-10 items-center font-semibold no-underline hover:underline"
            onClick={onNavigate}
          >
            Ver todo el catálogo →
          </Link>
        </section>
        <Link
          href={nav.pages.uniforms.href}
          onClick={onNavigate}
          className="bg-noche cancha text-blanco col-span-4 flex min-h-[300px] flex-col justify-between gap-4 p-7 no-underline"
        >
          <span className="flex flex-col gap-2.5">
            <span className="type-eyebrow text-lima">Uniformes a tu medida</span>
            <span className="font-display text-[44px] leading-[0.92] font-black italic uppercase">
              Tu nombre.
              <br />
              Tu número.
              <br />
              <span className="text-lima">Tu equipo.</span>
            </span>
          </span>
          <span className="type-body-strong inline-flex items-center gap-1.5">
            Conoce el servicio
            <ChevronRight aria-hidden="true" className="text-lima size-5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
