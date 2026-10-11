import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { placaOffset } from './angle';

type PlacaProps = {
  /** Height in px; the 13° slant offset is derived from it (height × 0.2309). */
  height: number;
  as?: 'span' | 'div' | 'strong' | 'p';
  className?: string;
  children?: ReactNode;
};

/**
 * Parallelogram at 13° (clip-path). Decorative container for plates, badges and counters.
 * clip-path also clips focus outlines, so interactive plates wrap it (see Button, T0.4).
 */
export function Placa({ height, as: Tag = 'span', className, children }: PlacaProps) {
  const style = { height, '--placa-o': `${placaOffset(height)}px` } as CSSProperties;
  return (
    <Tag className={cx('placa inline-flex items-center', className)} style={style}>
      {children}
    </Tag>
  );
}
