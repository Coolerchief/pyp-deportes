import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

type CorteA13Props = {
  /** The photo or photo slot; it fills the box. The box needs a height from its parent. */
  children: ReactNode;
  className?: string;
};

/**
 * Photo with one slanted side and a parallel rojo diagonal. Maximum one per screen.
 * Mobile: top edge falling ~7° to the right (48 px at 390 px, as in design/screens/movil).
 * Desktop (lg): left edge at 13°. Skewing a wrapper and unskewing the content keeps the
 * angle exact whatever the box size.
 */
export function CorteA13({ children, className }: CorteA13Props) {
  return (
    <div className={cx('relative overflow-hidden', className)}>
      <div className="absolute inset-0 origin-top-left skew-y-7 overflow-hidden lg:origin-bottom-left lg:skew-y-0 lg:-skew-x-13">
        <div className="absolute inset-0 origin-top-left -skew-y-7 lg:origin-bottom-left lg:skew-y-0 lg:skew-x-13">
          {children}
        </div>
      </div>
      <div
        aria-hidden="true"
        className="bg-rojo absolute inset-x-0 top-3 h-1.5 origin-top-left skew-y-7 lg:inset-y-0 lg:right-auto lg:left-28 lg:h-auto lg:w-2.5 lg:origin-bottom-left lg:skew-y-0 lg:-skew-x-13"
      />
    </div>
  );
}
