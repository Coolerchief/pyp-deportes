import type { HTMLAttributes } from 'react';
import { cn } from './cn';

// shadcn/ui Card with the brand tokens (UI/UX §9): white on gis, linea border, 2 px radius.

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'border-linea shadow-card flex min-w-0 flex-col gap-3 rounded-sm border bg-blanco p-4 lg:p-5',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('type-h4 text-noche', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('type-small text-grafito', className)} {...props} />;
}
