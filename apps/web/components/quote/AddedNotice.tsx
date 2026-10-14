'use client';

import { piecesText, QUOTE_MESSAGES } from '@pyp/shared';
import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useId, useRef } from 'react';
import { ProductImage } from '@/components/catalog/ProductImage';
import { Button } from '@/components/ui';
import { useQuoteTotals } from '@/lib/commerce';
import { useAddedNotice } from '@/lib/commerce/added-notice';
import { ROUTES } from '@/lib/navigation';

const FOCUSABLE = 'a[href], button:not([disabled])';

/**
 * AddedNotice (UI/UX §7.6, `ficha-agregado`): replaces the toast. Mobile: bottom sheet over the
 * veil. Desktop: anchored under "Mi cotización" with a lima top border. Shows the product, its
 * pieces per variant and the list total, with "Ver mi cotización" and "Seguir viendo el
 * catálogo". Closes with ×, Escape or a tap outside; focus returns to the button that added.
 */
export function AddedNotice() {
  const notice = useAddedNotice((s) => s.notice);
  const close = useAddedNotice((s) => s.close);
  const { pieces, products } = useQuoteTotals();
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!notice) return;
    const opener = useAddedNotice.getState().opener;
    // Focus on the main exit, "Ver mi cotización" (the only link in the notice).
    panel.current?.querySelector<HTMLElement>('a[href]')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      if (opener?.isConnected) opener.focus();
    };
  }, [notice, close]);

  if (!notice) return null;
  const total = notice.lines.reduce((sum, l) => sum + l.quantity, 0);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const focusable = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function keepBrowsing() {
    const back = useAddedNotice.getState().lastListing;
    close();
    // "Seguir viendo el catálogo" closes, and returns to the listing the visitor came from.
    if (back && back !== window.location.pathname + window.location.search) router.push(back);
  }

  return (
    <>
      <div aria-hidden="true" className="bg-noche/60 fixed inset-0 z-40 lg:hidden" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="bg-blanco shadow-float animate-sheet-up lg:animate-fade-in fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto lg:inset-x-auto lg:top-[80px] lg:right-[max(32px,calc((100vw-1216px)/2))] lg:bottom-auto lg:w-[400px] lg:border-t-4 lg:border-t-lima"
      >
        <div className="border-linea flex items-center justify-between gap-3 border-b py-2 pr-2 pl-4">
          <h2 id={titleId} className="type-h4 flex items-center gap-2.5">
            <span className="bg-lima text-noche flex size-7 shrink-0 items-center justify-center rounded-full">
              <Check aria-hidden="true" className="size-4" strokeWidth={3} />
            </span>
            Agregado a tu cotización
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="text-noche flex size-11 shrink-0 items-center justify-center"
          >
            <X aria-hidden="true" className="size-6" />
          </button>
        </div>
        <div className="flex flex-col gap-3.5 p-4">
          <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[72px_minmax(0,1fr)]">
            <ProductImage
              product={{ ...notice.product }}
              categoryName={notice.product.categoryName}
              sizes="72px"
            />
            <div className="flex flex-col gap-0.5">
              <span className="type-body-strong leading-[1.3]">{notice.product.name}</span>
              <span className="type-caption text-grafito-suave text-[13px]">
                {notice.product.sku}
                {notice.personalize && ' · con personalización'}
              </span>
              <span className="type-h4 mt-1">{piecesText(total)}</span>
            </div>
          </div>
          {notice.lines.some((l) => l.label) && (
            <ul aria-label="Piezas por variante" className="flex flex-wrap gap-1.5">
              {notice.lines.map((line) => (
                <li
                  key={line.label ?? 'default'}
                  className="border-borde-control type-small inline-flex h-8 items-center gap-1 rounded-sm border px-2.5"
                >
                  <b className="font-display text-base">{line.label}</b>× {line.quantity}
                </li>
              ))}
            </ul>
          )}
          {notice.skipped > 0 && (
            <p role="alert" className="type-small text-rojo-profundo">
              {QUOTE_MESSAGES.linesLimit}
            </p>
          )}
          <p
            aria-live="polite"
            className="border-linea text-grafito type-small flex justify-between border-t pt-3"
          >
            <span>Tu lista:</span>
            <span className="type-body-strong text-noche">
              {products} {products === 1 ? 'producto' : 'productos'} · {piecesText(pieces)}
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="primary" href={ROUTES.quote} fullWidth onClick={close}>
              Ver mi cotización
            </Button>
            <Button variant="outline" fullWidth onClick={keepBrowsing}>
              Seguir viendo el catálogo
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
