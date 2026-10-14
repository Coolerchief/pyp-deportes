'use client';

import {
  groupQuoteLines,
  piecesText,
  QUOTE_MESSAGES,
  type QuoteGroup,
  quoteTotals,
  unavailableLineIds,
} from '@pyp/shared';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { chipStyle } from '@/components/catalog/chip-style';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { useCatalog } from '@/lib/catalog-client';
import { useQuote } from '@/lib/commerce';
import { useAddedNotice } from '@/lib/commerce/added-notice';
import type { NavLink } from '@/lib/navigation';
import { ROUTES } from '@/lib/navigation';
import { PersonalizationEditor } from './PersonalizationEditor';
import { QuoteLineCard } from './QuoteLineCard';
import { UndoNotice } from './UndoNotice';

type Removed = ReturnType<ReturnType<typeof useQuote.getState>['remove']>;

/**
 * Step 1 · Tu lista (APP-FLOW §4.2, `cotizacion-1-lista`): the products with their pieces,
 * quantities to edit, remove with "Deshacer", personalization, the total and "Continuar".
 * Products no longer published (not in catalog.json) block "Continuar" until removed.
 */
export function QuoteListStep({
  sports,
  onContinue,
}: {
  sports: NavLink[];
  onContinue: () => void;
}) {
  const lines = useQuote((s) => s.lines);
  const hydrated = useQuote((s) => s.hydrated);
  const storageAvailable = useQuote((s) => s.storageAvailable);
  const { catalog } = useCatalog(true);
  const [undo, setUndo] = useState<{ message: string; removed: Removed } | null>(null);
  const [editing, setEditing] = useState<QuoteGroup | null>(null);

  const groups = useMemo(() => groupQuoteLines(lines), [lines]);
  const { pieces, products } = quoteTotals(lines);
  const productById = useMemo(
    () => new Map(catalog?.products.map((p) => [p.id, p]) ?? []),
    [catalog],
  );
  const categoryNames = useMemo(
    () => new Map(catalog?.categories.map((c) => [c.slug, c.name]) ?? []),
    [catalog],
  );
  // Only known once catalog.json arrived; until then nothing is marked.
  const unavailable = useMemo(
    () => (catalog ? unavailableLineIds(lines, new Set(productById.keys())) : new Set<string>()),
    [catalog, lines, productById],
  );
  const blocked = groups.some((g) => g.lines.some((l) => unavailable.has(l.lineId)));
  const back = useAddedNotice((s) => s.lastListing) ?? ROUTES.catalog;
  const dismissUndo = useCallback(() => setUndo(null), []);

  function remove(lineIds: string[], message: string) {
    const removed = useQuote.getState().remove(lineIds);
    setUndo({ message, removed });
  }

  if (!hydrated) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton tone="linea" className="h-10 w-2/3" />
        <Skeleton tone="gis" className="h-28" />
        <Skeleton tone="gis" className="h-28" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="type-h1">Mi cotización</h1>
        <EmptyState
          title="Tu lista está vacía"
          description="Agrega productos con sus cantidades por talla y te cotizamos por WhatsApp."
          action={
            <Button variant="primary" href={ROUTES.catalog}>
              Ver catálogo
            </Button>
          }
        />
        {sports.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="type-h3">Entra por tu deporte</h2>
            <ul className="flex flex-wrap gap-2">
              {sports.map((sport) => {
                const { className, style } = chipStyle(false);
                return (
                  <li key={sport.href} className="inline-flex">
                    <Link href={sport.href} className={className} style={style}>
                      {sport.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {undo && (
          <UndoNotice
            message={undo.message}
            onUndo={() => {
              useQuote.getState().undoRemove(undo.removed);
              setUndo(null);
            }}
            onDismiss={dismissUndo}
          />
        )}
      </div>
    );
  }

  const count = `${products} ${products === 1 ? 'producto' : 'productos'} · ${piecesText(pieces)}`;
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
      <section aria-labelledby="quote-title" className="lg:col-span-8">
        <h1 id="quote-title" className="type-h1">
          Mi cotización
        </h1>
        <p className="type-body text-grafito mt-1">{count}</p>
        {!storageAvailable && (
          <p role="alert" className="bg-gis type-small mt-3 p-3">
            {QUOTE_MESSAGES.noStorage}
          </p>
        )}
        <div className="border-linea mt-4 border-t">
          {groups.map((group) => {
            const product = productById.get(group.productId);
            return (
              <QuoteLineCard
                key={group.productId}
                group={group}
                product={product}
                categoryName={
                  product ? (categoryNames.get(product.category) ?? product.category) : ''
                }
                unavailable={group.lines.some((l) => unavailable.has(l.lineId))}
                onRemoveProduct={() =>
                  remove(
                    group.lines.map((l) => l.lineId),
                    `Quitaste ${group.snapshot.name}`,
                  )
                }
                onRemoveLine={(lineId) => {
                  const line = group.lines.find((l) => l.lineId === lineId);
                  remove(
                    [lineId],
                    `Quitaste ${line?.snapshot.variantLabel ?? 'una variante'} de ${group.snapshot.name}`,
                  );
                }}
                onQuantity={(lineId, quantity) => useQuote.getState().setQuantity(lineId, quantity)}
                onEditPersonalization={() => setEditing(group)}
              />
            );
          })}
        </div>
        <Link
          href={back}
          className="text-rojo-profundo type-body-strong mt-2 inline-flex min-h-11 items-center no-underline"
        >
          + Seguir agregando productos
        </Link>
      </section>

      <aside
        aria-label="Resumen"
        className="bg-gis flex flex-col gap-3 p-5 lg:sticky lg:top-[96px] lg:col-span-4"
      >
        <h2 className="type-eyebrow text-grafito-suave hidden lg:block">Resumen</h2>
        <div className="type-small text-grafito hidden justify-between lg:flex">
          <span>Productos</span>
          <span className="text-noche font-semibold">{products}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="type-small text-grafito">Total</span>
          <span className="type-number">{piecesText(pieces)}</span>
        </div>
        {blocked && (
          <p role="alert" className="type-small text-rojo-profundo font-semibold">
            Quita los productos que ya no están disponibles para continuar.
          </p>
        )}
        <Button variant="primary" size="lg" fullWidth disabled={blocked} onClick={onContinue}>
          Continuar
        </Button>
        <p className="type-caption text-grafito-suave">
          Tu lista se guarda en este <span className="lg:hidden">celular</span>
          <span className="hidden lg:inline">navegador</span> aunque cierres la página.
        </p>
      </aside>

      {editing && (
        <PersonalizationEditor
          group={editing}
          onClose={() => setEditing(null)}
          onSave={(personalize, notes) => {
            useQuote.getState().setPersonalization(editing.productId, personalize, notes);
            setEditing(null);
          }}
        />
      )}
      {undo && (
        <UndoNotice
          message={undo.message}
          onUndo={() => {
            useQuote.getState().undoRemove(undo.removed);
            setUndo(null);
          }}
          onDismiss={dismissUndo}
        />
      )}
    </div>
  );
}
