'use client';

import { Construction, Lock } from 'lucide-react';
import { ADMIN_SECTIONS, type AdminSectionId, canOpen } from '@/lib/admin/navigation';
import { useAdminSession } from './AdminGate';
import { Card, CardDescription } from './ui/card';

/**
 * A panel section whose screens arrive in a later task (T4.3–T4.9): its title and what it will
 * do, so the navigation already works. A section the role cannot open says so.
 */
export function SectionPlaceholder({
  id,
  summary,
  title,
}: {
  id: AdminSectionId;
  summary: string;
  /** A page inside the section, e.g. "Importar productos". */
  title?: string;
}) {
  const { staff } = useAdminSession();
  const section = ADMIN_SECTIONS.find((item) => item.id === id)!;
  const allowed = canOpen(staff.role, id);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="type-h2 text-noche">{title ?? section.label}</h1>
      <Card className="items-start">
        {allowed ? (
          <>
            <p className="type-body-strong text-noche flex items-center gap-2">
              <Construction aria-hidden="true" className="size-5 shrink-0" />
              {title ? 'Esta página' : 'Esta sección'} estará disponible pronto.
            </p>
            <CardDescription>{summary}</CardDescription>
          </>
        ) : (
          <p className="type-body-strong text-noche flex items-center gap-2">
            <Lock aria-hidden="true" className="size-5 shrink-0" />
            Solo un administrador puede abrir {section.label}.
          </p>
        )}
      </Card>
    </div>
  );
}
