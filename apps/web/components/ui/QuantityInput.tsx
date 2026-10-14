'use client';

import { cleanQuantity, QUOTE_LIMITS } from '@pyp/shared';
import { Minus, Plus } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { cx } from '@/lib/cx';

type QuantityInputProps = {
  value: number;
  onChange: (value: number) => void;
  /** Accessible name of the field: "Cantidad talla M". */
  label: string;
  /** Short name for the buttons: "Sumar una pieza, M". */
  shortLabel: string;
  /** 0 in the product matrix; 1 in the quote list (0 is "quitar"). */
  min?: number;
};

const STEP =
  'border-borde-control text-noche flex size-11 shrink-0 items-center justify-center border disabled:opacity-40';

/**
 * Quantity stepper (UI/UX §7.5): "−" and "+" of 44 px around a 56 px numeric field. ↑/↓ add or
 * subtract; typing is cleaned to whole numbers between `min` and 9 999.
 */
export function QuantityInput({ value, onChange, label, shortLabel, min = 0 }: QuantityInputProps) {
  const set = (next: number) => onChange(Math.max(min, cleanQuantity(next)));
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      set(value + (event.key === 'ArrowUp' ? 1 : -1));
    }
  }
  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label={`Restar una pieza, ${shortLabel}`}
        disabled={value <= min}
        onClick={() => set(value - 1)}
        className={cx(STEP, 'rounded-l-sm')}
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={label}
        value={String(value)}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => set(cleanQuantity(event.target.value))}
        onKeyDown={onKeyDown}
        className="border-borde-control type-body-strong h-11 w-14 border-y text-center tabular-nums"
      />
      <button
        type="button"
        aria-label={`Sumar una pieza, ${shortLabel}`}
        disabled={value >= QUOTE_LIMITS.quantityMax}
        onClick={() => set(value + 1)}
        className={cx(STEP, 'rounded-r-sm')}
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
