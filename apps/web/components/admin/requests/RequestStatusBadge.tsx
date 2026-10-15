import { type QuoteStatus, quoteStatusLabels } from '@pyp/shared';
import { cn } from '../ui/cn';

const tones: Record<QuoteStatus, string> = {
  new: 'bg-lima text-noche border-lima',
  in_progress: 'bg-gis text-noche border-borde-control',
  quoted: 'bg-noche text-blanco border-noche',
  won: 'bg-exito text-blanco border-exito',
  lost: 'bg-linea text-grafito border-linea',
};

/** Nueva / En atención / Cotizada / Ganada / Perdida, always in words. */
export function RequestStatusBadge({
  status,
  className,
}: {
  status: QuoteStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'type-caption inline-flex h-6 items-center rounded-sm border px-2 font-semibold whitespace-nowrap',
        tones[status],
        className,
      )}
    >
      {quoteStatusLabels[status]}
    </span>
  );
}

const dateFormat = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** '2026-11-20' → "20 nov 2026" (a calendar date, no time zone involved). */
export function formatCalendarDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`)).replace('.', '');
}
