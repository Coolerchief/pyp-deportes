import { Placa } from '@/components/brand';
import { cx } from '@/lib/cx';

export type BadgeVariant = 'new' | 'custom' | 'info';

// custom uses noche instead of the design's rojo: white 12 px text on rojo fails contrast
// (UI/UX §2.1; decided 10-oct-2026).
const VARIANT: Record<BadgeVariant, string> = {
  new: 'bg-lima text-noche',
  custom: 'bg-noche text-blanco',
  info: 'bg-noche text-blanco',
};

type BadgeProps = {
  variant: BadgeVariant;
  /** One or two words: "Nuevo", "Personalizable", "Por volumen". */
  children: string;
  className?: string;
};

/** Small 13° plate marking a product's state (UI/UX §7.2). At most two per card. */
export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <Placa height={24} className={cx('type-badge px-3.5', VARIANT[variant], className)}>
      {children}
    </Placa>
  );
}
