'use client';

import {
  type CatalogProduct,
  matrixLayout,
  type MatrixRow,
  piecesText,
  QUOTE_LIMITS,
  rowPieces,
  TEAM_PRESETS,
  teamPreset,
  variantLabel,
} from '@pyp/shared';
import { useEffect, useId, useMemo, useState } from 'react';
import { chipStyle } from '@/components/catalog/chip-style';
import { Button } from '@/components/ui';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { useQuote } from '@/lib/commerce';
import { useAddedNotice } from '@/lib/commerce/added-notice';
import { cx } from '@/lib/cx';

/** Height of the fixed total bar on mobile; the floating WhatsApp button rises above it. */
const BAR_HEIGHT = '88px';

type VariantMatrixProps = {
  product: CatalogProduct;
  /** For the generic image in the added notice. */
  categoryName: string;
  /** Full page: team shortcuts and personalization. Simple page: neither. */
  customizable: boolean;
};

function Stepper({
  row,
  dimension,
  value,
  onChange,
}: {
  row: MatrixRow;
  dimension: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-display w-14 shrink-0 text-[18px] leading-none font-bold">
        {row.label}
      </span>
      <QuantityInput
        value={value}
        onChange={onChange}
        label={dimension === 'pieza' ? 'Cantidad' : `Cantidad ${dimension} ${row.label}`}
        shortLabel={row.label}
      />
      <span aria-hidden="true" className="type-small text-grafito-suave ml-auto w-14 text-right">
        {rowPieces(value)}
      </span>
    </div>
  );
}

/**
 * Quantity matrix (UI/UX §7.5, FR-M2-2): quantities per size (or per size of each color), the
 * "Equipo de 12 / 18 / 24" shortcuts and personalization on the full page, and the total bar
 * with "Agregar a mi cotización" (fixed at the bottom on mobile). Adding creates one quote line
 * per variant with pieces and puts the quantities back to 0.
 */
export function VariantMatrix({ product, categoryName, customizable }: VariantMatrixProps) {
  const layout = useMemo(() => matrixLayout(product), [product]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [colorIndex, setColorIndex] = useState(0);
  const [preset, setPreset] = useState<number | null>(null);
  const [personalize, setPersonalize] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const titleId = useId();
  const notesId = useId();

  // The fixed bar covers the bottom of the screen on mobile: lift the floating button over it.
  useEffect(() => {
    document.documentElement.style.setProperty('--bottom-bar', BAR_HEIGHT);
    return () => {
      document.documentElement.style.removeProperty('--bottom-bar');
    };
  }, []);

  const rows = layout.colors ? (layout.colors[colorIndex]?.rows ?? []) : layout.rows;
  const allRows = layout.colors ? layout.colors.flatMap((c) => c.rows) : layout.rows;
  const total = allRows.reduce((sum, row) => sum + (quantities[row.variantId] ?? 0), 0);
  const piecesOfColor = (colorRows: MatrixRow[]) =>
    colorRows.reduce((sum, row) => sum + (quantities[row.variantId] ?? 0), 0);
  const showPresets = customizable && layout.dimension === 'talla' && rows.length > 1;
  const per = layout.dimension === 'pieza' ? '' : ` por ${layout.dimension}`;

  function setQuantity(variantId: string, value: number) {
    setQuantities((q) => ({ ...q, [variantId]: value }));
    setPreset(null);
    setStatus('');
  }

  function applyPreset(size: number) {
    const spread = teamPreset(
      rows.map((r) => r.label),
      size,
    );
    setQuantities((q) => {
      const next = { ...q };
      for (const row of rows) next[row.variantId] = spread.get(row.label) ?? 0;
      return next;
    });
    setPreset(size);
    setStatus('');
  }

  function add() {
    const byId = new Map(product.variants.map((v) => [v.id, v]));
    const lines = allRows
      .filter((row) => (quantities[row.variantId] ?? 0) > 0)
      .map((row) => {
        const variant = byId.get(row.variantId);
        return {
          variantId: row.variantId,
          label: variant ? variantLabel(variant.o1, variant.o2) : null,
          quantity: quantities[row.variantId] ?? 0,
        };
      });
    const withNotes = customizable && personalize;
    const { skipped } = useQuote.getState().add({
      productId: product.id,
      personalize: withNotes,
      notes: withNotes ? notes : '',
      product: {
        name: product.name,
        sku: product.sku,
        slug: product.slug,
        image: product.image?.keyBase ?? null,
      },
      variants: lines,
    });
    setQuantities({});
    setPreset(null);
    useAddedNotice.getState().show({
      product: { ...product, categoryName },
      personalize: withNotes,
      lines: lines.map(({ label, quantity }) => ({ label, quantity })),
      skipped,
    });
    // For screen readers; the notice itself also announces the list total.
    setStatus(`Agregado a tu cotización: ${piecesText(total)}.`);
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={titleId} className="type-h4">
          Cantidad{per}
        </h2>
        {layout.fixedColor && (
          <span className="type-small text-grafito-suave">Color: {layout.fixedColor}</span>
        )}
      </div>

      {layout.colors && (
        <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2">
          {layout.colors.map((color, index) => {
            const active = index === colorIndex;
            const { className, style } = chipStyle(active);
            const pieces = piecesOfColor(color.rows);
            return (
              <span key={color.name} className={active ? 'focus-placa inline-flex' : 'inline-flex'}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setColorIndex(index)}
                  style={style}
                  className={className}
                >
                  {color.name}
                  {pieces > 0 && ` (${pieces})`}
                </button>
              </span>
            );
          })}
        </div>
      )}

      {showPresets && (
        <div className="flex flex-wrap gap-2">
          {TEAM_PRESETS.map((size) => {
            const active = preset === size;
            const { className, style } = chipStyle(active);
            return (
              <span key={size} className={active ? 'focus-placa inline-flex' : 'inline-flex'}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyPreset(size)}
                  style={style}
                  className={className}
                >
                  Equipo de {size}
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className={cx('grid gap-y-3', rows.length > 4 && 'lg:grid-cols-2 lg:gap-x-8')}>
        {rows.map((row) => (
          <Stepper
            key={row.variantId}
            row={row}
            dimension={layout.dimension}
            value={quantities[row.variantId] ?? 0}
            onChange={(value) => setQuantity(row.variantId, value)}
          />
        ))}
      </div>

      {layout.colors && total > 0 && (
        <p className="type-small text-grafito-suave">
          {layout.colors
            .map((color) => [color.name, piecesOfColor(color.rows)] as const)
            .filter(([, pieces]) => pieces > 0)
            .map(([name, pieces]) => `${name}: ${pieces}`)
            .join(' · ')}
        </p>
      )}

      {customizable && (
        <div className="flex flex-col gap-2">
          <label className="type-body-strong flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={personalize}
              onChange={(event) => setPersonalize(event.target.checked)}
              className="accent-noche size-5"
            />
            Quiero personalizarlo
          </label>
          {personalize && (
            <>
              <textarea
                aria-label="Detalles de personalización"
                aria-describedby={notesId}
                value={notes}
                maxLength={QUOTE_LIMITS.itemNotesMax}
                rows={3}
                placeholder="Escudo, nombres, números, colores del club…"
                onChange={(event) => setNotes(event.target.value)}
                className="border-borde-control type-body rounded-sm border p-3"
              />
              <span id={notesId} className="type-caption text-grafito-suave">
                Máximo {QUOTE_LIMITS.itemNotesMax} caracteres. Te enviamos una prueba digital antes
                de producir. ({notes.length}/{QUOTE_LIMITS.itemNotesMax})
              </span>
            </>
          )}
        </div>
      )}

      <p role="status" aria-live="polite" className="type-body-strong text-exito min-h-6">
        {status}
      </p>

      {/* Total bar: fixed at the bottom on mobile, under the matrix on gis from lg. */}
      <div className="bg-blanco border-linea shadow-float fixed inset-x-0 bottom-0 z-20 flex h-[88px] items-center justify-between gap-3 border-t px-4 lg:static lg:h-auto lg:border-0 lg:bg-gis lg:p-5 lg:shadow-none">
        <div>
          <div className="type-small text-grafito-suave">Total</div>
          <div className="type-number whitespace-nowrap">{piecesText(total)}</div>
        </div>
        {total > 0 ? (
          <Button variant="primary" onClick={add} dense>
            Agregar a mi cotización
          </Button>
        ) : (
          <span className="type-small text-grafito-suave max-w-[11rem] text-right">
            Indica cuántas piezas necesitas{per}
          </span>
        )}
      </div>
    </section>
  );
}
