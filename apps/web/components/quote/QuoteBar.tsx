'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { placaOffset } from '@/components/brand';
import { useQuoteTotals } from '@/lib/commerce';
import { ROUTES } from '@/lib/navigation';

const HEIGHT = 72;

/**
 * QuoteBar (UI/UX §7.6, mobile only): fixed noche bar with "Mi cotización · 3 productos · 42
 * piezas" and "Ver", visible with 1 piece or more. Not on /cotizacion (already there) nor on a
 * product page, whose total bar takes the bottom. The WhatsApp button rises over it.
 */
export function QuoteBar() {
  const pathname = usePathname();
  const { pieces, products } = useQuoteTotals();
  const hidden =
    pieces === 0 || pathname.startsWith(ROUTES.quote) || pathname.startsWith('/producto/');

  useEffect(() => {
    if (hidden) return;
    const root = document.documentElement;
    // Only below lg: the bar does not exist on desktop.
    const media = window.matchMedia?.('(min-width: 1024px)');
    const apply = () =>
      media?.matches
        ? root.style.removeProperty('--bottom-bar')
        : root.style.setProperty('--bottom-bar', `${HEIGHT}px`);
    apply();
    media?.addEventListener('change', apply);
    return () => {
      media?.removeEventListener('change', apply);
      root.style.removeProperty('--bottom-bar');
    };
  }, [hidden]);

  if (hidden) return null;
  const offset = placaOffset(40);
  return (
    <>
      {/* Keeps the end of the page (footer) clear of the fixed bar. */}
      <div aria-hidden="true" className="h-[72px] lg:hidden" />
      <div
        role="region"
        aria-label="Mi cotización"
        className="bg-noche text-blanco fixed inset-x-0 bottom-0 z-20 flex h-[72px] items-center justify-between gap-3 px-4 lg:hidden"
      >
        <p className="type-small leading-tight">
          <b className="type-body-strong block">Mi cotización</b>
          {products} {products === 1 ? 'producto' : 'productos'} ·{' '}
          <span className="placa bg-lima text-noche font-display inline-flex h-6 items-center px-2 align-middle text-base font-black italic [--placa-o:5px]">
            {pieces}
          </span>{' '}
          {pieces === 1 ? 'pieza' : 'piezas'}
        </p>
        <span className="focus-placa inline-flex">
          <Link
            href={ROUTES.quote}
            aria-label={`Ver mi cotización, ${pieces} ${pieces === 1 ? 'pieza' : 'piezas'}`}
            className="placa bg-lima text-noche type-button inline-flex h-10 items-center no-underline"
            style={{ ['--placa-o' as string]: `${offset}px`, paddingInline: 20 + offset }}
          >
            Ver
          </Link>
        </span>
      </div>
    </>
  );
}
