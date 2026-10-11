import type { ReactNode } from 'react';
import { DobleDiagonal } from '@/components/brand';
import { cx } from '@/lib/cx';

type EmptyStateProps = {
  title: string;
  description: string;
  /** The single primary action ("Ver catálogo", "Limpiar filtros"), shown under the block. */
  action?: ReactNode;
  headingLevel?: 'h2' | 'h3';
  className?: string;
};

/** Empty or no-results block (UI/UX §7.8): never a dead end, always one clear action. */
export function EmptyState({
  title,
  description,
  action,
  headingLevel: Heading = 'h2',
  className,
}: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col gap-4', className)}>
      <div className="bg-gis flex flex-col items-center gap-3 px-6 py-8 text-center">
        <DobleDiagonal height={44} className="text-concreto" />
        <Heading className="type-h4">{title}</Heading>
        <p className="type-body text-grafito max-w-prose">{description}</p>
      </div>
      {action}
    </div>
  );
}
