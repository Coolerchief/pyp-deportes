'use client';

import { groupQuoteLines, piecesText, type QuoteRequester, quoteTotals } from '@pyp/shared';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Button } from '@/components/ui';
import { useQuote } from '@/lib/commerce';
import { ROUTES } from '@/lib/navigation';
import { QuoteForm } from './QuoteForm';

const NOTE = 'Te contestamos en horario de tienda. Tu lista se guarda aunque cierres esta página.';

function ListSummary() {
  const lines = useQuote((s) => s.lines);
  const groups = useMemo(() => groupQuoteLines(lines), [lines]);
  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group) => (
        <li key={group.productId} className="flex flex-col">
          <span className="type-body-strong leading-[1.3]">{group.snapshot.name}</span>
          <span className="type-caption text-grafito-suave text-[13px]">
            {[
              group.snapshot.sku,
              ...group.lines.map((l) =>
                l.snapshot.variantLabel ? `${l.snapshot.variantLabel} × ${l.quantity}` : '',
              ),
              group.personalize ? 'personalizado' : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className="type-small font-semibold">{piecesText(group.pieces)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Step 2 · Tus datos (`cotizacion-2-datos`). Mobile: collapsible summary of the list on top,
 * the form and the send button. Desktop: the form on the left and "Tu lista" on the right with
 * the total and the send button (it submits the form through its id).
 */
export function QuoteFormStep({
  privacyVersion,
  onValid,
}: {
  privacyVersion: string;
  onValid: (values: QuoteRequester) => void;
}) {
  const formId = useId();
  const lines = useQuote((s) => s.lines);
  const { pieces, products } = quoteTotals(lines);
  const [open, setOpen] = useState(false);
  const count = `${products} ${products === 1 ? 'producto' : 'productos'}`;

  const send = (
    <Button
      variant="whatsapp"
      size="lg"
      type="submit"
      form={formId}
      fullWidth
      icon={<WhatsAppGlyph size={22} />}
    >
      Enviar cotización por WhatsApp
    </Button>
  );

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
      <div className="flex flex-col gap-5 lg:col-span-7">
        <div className="bg-gis lg:hidden">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex min-h-12 w-full items-center justify-between px-4 text-left"
          >
            <span className="type-small">
              <b>{count}</b> · {piecesText(pieces)}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={
                open ? 'size-5 rotate-180 transition-transform' : 'size-5 transition-transform'
              }
            />
          </button>
          {open && (
            <div className="border-linea border-t px-4 py-3">
              <ListSummary />
            </div>
          )}
        </div>

        <h1 className="type-h1">Tus datos</h1>
        <QuoteForm id={formId} privacyVersion={privacyVersion} onValid={onValid} />

        <div className="flex flex-col gap-2 lg:hidden">
          {send}
          <p className="type-caption text-grafito-suave">{NOTE}</p>
        </div>
      </div>

      <aside
        aria-label="Tu lista"
        className="bg-gis hidden flex-col gap-4 p-5 lg:sticky lg:top-[96px] lg:col-span-5 lg:flex"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="type-h4">Tu lista</h2>
          <Link href={ROUTES.quote} className="text-rojo-profundo type-small font-semibold">
            Editar lista
          </Link>
        </div>
        <ListSummary />
        <div className="border-linea flex items-baseline justify-between border-t pt-3">
          <span className="type-small text-grafito">Total</span>
          <span className="type-number">{piecesText(pieces)}</span>
        </div>
        {send}
        <p className="type-caption text-grafito-suave">{NOTE}</p>
      </aside>
    </div>
  );
}
