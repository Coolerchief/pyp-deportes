import { cx } from '@/lib/cx';

type SkeletonProps = {
  /** gis for image areas, linea for text lines (UI/UX §7.8). */
  tone?: 'gis' | 'linea';
  /** Size and shape, e.g. "aspect-[4/5]" or "h-3 w-2/3". */
  className?: string;
};

/**
 * Loading placeholder. Hidden from assistive tech: the screen announces "Cargando productos…"
 * in an aria-live region instead. No pulse with reduced motion.
 */
export function Skeleton({ tone = 'gis', className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx(tone === 'gis' ? 'bg-gis' : 'bg-linea', 'motion-safe:animate-pulse', className)}
    />
  );
}
