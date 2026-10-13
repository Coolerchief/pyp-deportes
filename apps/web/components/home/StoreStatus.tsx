'use client';

import { type StoreHoursBlock, storeStatus } from '@pyp/shared';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cx } from '@/lib/cx';

/**
 * "Abierto ahora · cierra 19:00" (APP-FLOW §5). The site is static, so it is worked out in the
 * visitor's browser with Mexico City time, after the page loads, and refreshed every minute.
 */
export function StoreStatus({ hours }: { hours: StoreHoursBlock[] }) {
  const [status, setStatus] = useState<ReturnType<typeof storeStatus>>(null);
  useEffect(() => {
    const update = () => setStatus(storeStatus(hours, new Date()));
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [hours]);

  if (!status) return null;
  return (
    <p
      className={cx(
        'type-body-strong flex items-center gap-2',
        status.open ? 'text-exito' : 'text-grafito',
      )}
    >
      <Clock aria-hidden="true" className="size-5" />
      {status.text}
    </p>
  );
}
