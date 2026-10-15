'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/brand';
import { ADMIN_ROUTES, roleLabels } from '@/lib/admin/access';
import { useAdminSession } from './AdminGate';
import { Button } from './ui/button';

/** Panel bar: logo, who is signed in and "Cerrar sesión"; the sections are in AdminNav. */
export function AdminHeader() {
  const { staff, signOut } = useAdminSession();
  const [leaving, setLeaving] = useState(false);
  return (
    <header className="border-linea sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-blanco px-4 lg:px-8">
      <Link href={ADMIN_ROUTES.home} aria-label="Inicio del panel" className="shrink-0">
        <Logo width={132} />
      </Link>
      <div className="flex min-w-0 items-center gap-3">
        <p className="hidden min-w-0 flex-col text-right sm:flex">
          <span className="type-small text-noche truncate font-semibold">{staff.fullName}</span>
          <span className="type-caption text-grafito-suave">{roleLabels[staff.role]}</span>
        </p>
        <Button
          variant="outline"
          size="sm"
          loading={leaving}
          loadingText="Saliendo…"
          onClick={() => {
            setLeaving(true);
            void signOut();
          }}
        >
          <LogOut aria-hidden="true" />
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
