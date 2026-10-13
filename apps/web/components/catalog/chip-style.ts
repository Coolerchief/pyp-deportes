import type { CSSProperties } from 'react';
import { placaOffset } from '@/components/brand';
import { cx } from '@/lib/cx';

const CHIP_HEIGHT = 36;

/**
 * Look of the chips that switch listings or categories (UI/UX §7.2): outlined, or a noche plate
 * when current. Shared by server links (routes) and client buttons (?categoria=).
 */
export function chipStyle(active: boolean): { className: string; style: CSSProperties } {
  const offset = placaOffset(CHIP_HEIGHT);
  return {
    className: cx(
      'type-chip inline-flex items-center whitespace-nowrap no-underline',
      active
        ? 'placa bg-noche text-blanco font-semibold'
        : 'border-borde-control bg-blanco text-noche rounded-sm border px-3',
    ),
    style: (active
      ? { height: CHIP_HEIGHT, '--placa-o': `${offset}px`, paddingInline: 12 + offset }
      : { height: CHIP_HEIGHT }) as CSSProperties,
  };
}

export const CHIP_ROW =
  '-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:px-0';
