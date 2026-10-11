import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

type PatronCanchaProps = {
  /** Only on noche (default) or rojo. Never behind small text or forms. */
  tone?: 'noche' | 'rojo';
  as?: 'div' | 'section';
  className?: string;
  children?: ReactNode;
};

/** 13° stripe texture (white at 7%) for hero, uniform bands, confirmation and generic images. */
export function PatronCancha({
  tone = 'noche',
  as: Tag = 'div',
  className,
  children,
}: PatronCanchaProps) {
  return (
    <Tag className={cx('cancha', tone === 'rojo' ? 'bg-rojo' : 'bg-noche', className)}>
      {children}
    </Tag>
  );
}
