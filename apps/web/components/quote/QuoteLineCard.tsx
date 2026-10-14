'use client';

import { type CatalogProduct, piecesText, type QuoteGroup } from '@pyp/shared';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';
import { ProductImage } from '@/components/catalog/ProductImage';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { mediaUrl } from '@/lib/images/loader';
import { ROUTES } from '@/lib/navigation';

type QuoteLineCardProps = {
  group: QuoteGroup;
  /** From catalog.json; undefined while it loads or when the product is gone. */
  product: CatalogProduct | undefined;
  categoryName: string;
  unavailable: boolean;
  onRemoveProduct: () => void;
  onRemoveLine: (lineId: string) => void;
  onQuantity: (lineId: string, quantity: number) => void;
  onEditPersonalization: () => void;
};

function Thumb({
  group,
  product,
  categoryName,
}: Pick<QuoteLineCardProps, 'group' | 'product' | 'categoryName'>) {
  if (product) {
    return <ProductImage product={product} categoryName={categoryName} sizes="88px" />;
  }
  if (group.snapshot.image) {
    return (
      <div className="bg-gis relative aspect-[4/5] overflow-hidden">
        <Image
          src={mediaUrl(group.snapshot.image)}
          alt=""
          fill
          sizes="88px"
          className="object-cover"
        />
      </div>
    );
  }
  return <div aria-hidden="true" className="bg-gis aspect-[4/5]" />;
}

/**
 * QuoteLine (UI/UX §7.6): thumbnail, name (link), SKU, total pieces, the breakdown per variant
 * ("CH × 3"), the personalization block with "Editar", and "Quitar". "Editar cantidades" opens
 * a stepper per variant (APP-FLOW §4.2). A product no longer published is marked "No
 * disponible" and has to be removed before continuing.
 */
export function QuoteLineCard({
  group,
  product,
  categoryName,
  unavailable,
  onRemoveProduct,
  onRemoveLine,
  onQuantity,
  onEditPersonalization,
}: QuoteLineCardProps) {
  const [editing, setEditing] = useState(false);
  const editorId = useId();
  const { snapshot } = group;
  const label = (variantLabel: string | null) => variantLabel ?? 'Piezas';

  return (
    <article
      aria-label={snapshot.name}
      className="border-linea grid grid-cols-[64px_minmax(0,1fr)_auto] gap-x-3 gap-y-3 border-b py-4 lg:grid-cols-[88px_minmax(0,1fr)_auto]"
    >
      <Thumb group={group} product={product} categoryName={categoryName} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          href={ROUTES.product(snapshot.slug)}
          className="type-body-strong text-noche leading-[1.3]"
        >
          {snapshot.name}
        </Link>
        <span className="type-caption text-grafito-suave text-[13px]">{snapshot.sku}</span>
        <span className="type-h4 mt-1">{piecesText(group.pieces)}</span>
        {unavailable && (
          <p className="type-small text-rojo-profundo mt-1 flex items-start gap-1.5 font-semibold">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            No disponible. Quítalo para enviar tu lista.
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label={`Quitar ${snapshot.name}`}
        onClick={onRemoveProduct}
        className="text-grafito flex size-11 items-center justify-center self-start"
      >
        <Trash2 aria-hidden="true" className="size-5" />
      </button>

      <div className="col-span-3 flex flex-col gap-3 lg:col-span-2 lg:col-start-2">
        {!editing && (
          <ul aria-label="Piezas por variante" className="flex flex-wrap gap-1.5">
            {group.lines.map((line) => (
              <li
                key={line.lineId}
                className="border-borde-control type-small inline-flex h-8 items-center gap-1 rounded-sm border px-2.5"
              >
                <b className="font-display text-base">{label(line.snapshot.variantLabel)}</b>×{' '}
                {line.quantity}
              </li>
            ))}
          </ul>
        )}
        {editing && (
          <ul id={editorId} aria-label="Cantidades" className="flex flex-col gap-2">
            {group.lines.map((line) => {
              const name = label(line.snapshot.variantLabel);
              return (
                <li key={line.lineId} className="flex items-center gap-3">
                  <span className="font-display w-20 shrink-0 text-[18px] leading-none font-bold">
                    {name}
                  </span>
                  <QuantityInput
                    value={line.quantity}
                    min={1}
                    onChange={(value) => onQuantity(line.lineId, value)}
                    label={`Cantidad ${name}, ${snapshot.name}`}
                    shortLabel={name}
                  />
                  <button
                    type="button"
                    aria-label={`Quitar ${name} de ${snapshot.name}`}
                    onClick={() => onRemoveLine(line.lineId)}
                    className="text-grafito ml-auto flex size-11 items-center justify-center"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!unavailable && (
          <button
            type="button"
            aria-expanded={editing}
            aria-controls={editing ? editorId : undefined}
            onClick={() => setEditing(!editing)}
            className="text-rojo-profundo type-small min-h-11 self-start font-semibold"
          >
            {editing ? 'Listo' : 'Editar cantidades'}
          </button>
        )}

        {group.personalize ? (
          <div className="bg-gis flex items-start gap-2.5 p-3">
            <Pencil aria-hidden="true" className="text-grafito mt-0.5 size-4 shrink-0" />
            <p className="type-small grow">
              <b>Personalizar:</b> {group.notes || 'sin detalles todavía.'}
            </p>
            <button
              type="button"
              onClick={onEditPersonalization}
              aria-label={`Editar personalización de ${snapshot.name}`}
              className="text-rojo-profundo type-small -my-3 min-h-11 shrink-0 font-semibold"
            >
              Editar
            </button>
          </div>
        ) : (
          product?.customizable &&
          !unavailable && (
            <button
              type="button"
              onClick={onEditPersonalization}
              className="text-rojo-profundo type-small min-h-11 self-start font-semibold"
            >
              + Agregar personalización
            </button>
          )
        )}
      </div>
    </article>
  );
}
