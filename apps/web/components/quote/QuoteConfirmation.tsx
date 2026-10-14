'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DobleDiagonal, Placa } from '@/components/brand';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button } from '@/components/ui';
import { useQuote } from '@/lib/commerce';
import { useAddedNotice } from '@/lib/commerce/added-notice';
import { type LastQuote, openWhatsApp, useSubmission } from '@/lib/commerce/submission';
import { ROUTES } from '@/lib/navigation';

const NOTE =
  'Te contestamos por WhatsApp en horario de tienda. Si WhatsApp no se abrió, toca el botón.';

/**
 * Step 3 · Confirmación (`cotizacion-3-confirmacion`, UI/UX §7.6): the folio with a copy button
 * and "Abrir WhatsApp" always visible, in case the browser blocked the automatic opening.
 * Without folio (the request could not be saved) the plate is left out and the title changes.
 * The list is not emptied by itself: "Vaciar mi lista" does it.
 */
export function QuoteConfirmation({ last }: { last: LastQuote }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const [emptied, setEmptied] = useState(false);
  const hasLines = useQuote((s) => s.lines.length > 0);
  const back = useAddedNotice((s) => s.lastListing) ?? ROUTES.catalog;

  // A new screen in the same page: screen readers start at the title. Right after sending,
  // WhatsApp opens by itself (only once).
  useEffect(() => {
    heading.current?.focus();
    const url = useSubmission.getState().takePendingOpen();
    if (url) openWhatsApp(url);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    if (!last.folio) return;
    try {
      await navigator.clipboard.writeText(last.folio);
      setCopied(true);
    } catch {
      // No clipboard permission: the folio stays visible to copy by hand.
    }
  }

  function empty() {
    useQuote.getState().clear();
    setEmptied(true);
  }

  return (
    <section className="cancha bg-noche text-blanco relative flex min-h-[calc(100svh-64px)] flex-col overflow-hidden lg:min-h-[calc(100svh-72px)]">
      <div className="container-page flex flex-col gap-4 pt-12 pb-20 lg:gap-5 lg:pt-24">
        {last.folio && <p className="type-eyebrow text-lima">Solicitud enviada</p>}
        <h1
          ref={heading}
          tabIndex={-1}
          className={last.folio ? 'type-display outline-none' : 'type-h1 max-w-[16ch] outline-none'}
        >
          {last.folio ? '¡Listo!' : 'Tu lista está lista para enviarse'}
        </h1>

        {last.folio && (
          <div className="flex flex-col gap-2">
            <p className="type-small">Tu folio</p>
            <div className="flex items-center gap-3">
              <Placa height={56} className="bg-lima text-noche type-number px-7">
                {last.folio}
              </Placa>
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? 'Folio copiado' : 'Copiar folio'}
                className="hover:text-lima flex size-11 items-center justify-center"
              >
                {copied ? (
                  <Check aria-hidden="true" className="size-6" />
                ) : (
                  <Copy aria-hidden="true" className="size-6" />
                )}
              </button>
              <span role="status" className="type-small text-lima">
                {copied ? 'Copiado' : ''}
              </span>
            </div>
          </div>
        )}

        <p className="type-body-lg max-w-[34rem]">{NOTE}</p>

        <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-center lg:gap-5">
          <Button
            variant="whatsapp"
            size="lg"
            href={last.waUrl}
            external
            fullWidth
            className="lg:w-auto"
            icon={<WhatsAppGlyph size={22} />}
          >
            Abrir WhatsApp
          </Button>
          <Button
            variant="outline"
            tone="dark"
            size="lg"
            href={back}
            fullWidth
            className="lg:w-auto"
          >
            Seguir viendo el catálogo
          </Button>
          {emptied ? (
            <p role="status" className="type-body-strong text-lima text-center lg:text-left">
              Vaciamos tu lista.
            </p>
          ) : (
            hasLines && (
              <div className="flex justify-center lg:block">
                <Button variant="ghost" tone="dark" size="lg" onClick={empty}>
                  Vaciar mi lista
                </Button>
              </div>
            )
          )}
        </div>
      </div>

      <DobleDiagonal
        height={220}
        className="text-lima absolute top-28 right-[max(32px,calc((100vw-1216px)/2))] hidden lg:block"
      />
      <DobleDiagonal height={44} className="text-lima absolute right-5 bottom-6 lg:hidden" />
    </section>
  );
}
