import { X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { placaOffset } from '@/components/brand';
import { cx } from '@/lib/cx';

type ChipProps = {
  label: string;
  /** Number of matching products, shown as "(12)". */
  count?: number;
  selected: boolean;
  onToggle: () => void;
  className?: string;
};

const HEIGHT = 36;

/** Catalog filter toggle (UI/UX §7.2): outlined when off, noche plate with "×" when on. */
export function Chip({ label, count, selected, onToggle, className }: ChipProps) {
  const offset = placaOffset(HEIGHT);
  const style = (
    selected
      ? { height: HEIGHT, '--placa-o': `${offset}px`, paddingInline: 12 + offset }
      : { height: HEIGHT }
  ) as CSSProperties;

  return (
    <span className={cx('inline-flex shrink-0', selected && 'focus-placa', className)}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        style={style}
        className={cx(
          'type-chip inline-flex items-center gap-2 whitespace-nowrap',
          'transition-colors duration-150 ease-brand',
          selected
            ? 'placa bg-noche text-blanco font-semibold'
            : 'border-borde-control bg-blanco text-noche rounded-sm border px-3',
        )}
      >
        {count === undefined ? label : `${label} (${count})`}
        {selected && <X aria-hidden="true" className="size-4" strokeWidth={2.5} />}
      </button>
    </span>
  );
}
