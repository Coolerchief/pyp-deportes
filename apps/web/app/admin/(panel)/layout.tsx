import type { ReactNode } from 'react';
import { AdminGate } from '@/components/admin/AdminGate';
import { AdminHeader } from '@/components/admin/AdminHeader';

/** Every panel route but the login goes through AdminGate (T4.1). */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <div className="bg-gis flex min-h-svh flex-col">
        <AdminHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </AdminGate>
  );
}
