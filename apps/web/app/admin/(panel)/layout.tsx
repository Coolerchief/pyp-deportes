import type { ReactNode } from 'react';
import { AdminGate } from '@/components/admin/AdminGate';
import { AdminShell } from '@/components/admin/AdminShell';

/** Every panel route but the login goes through AdminGate (T4.1) and the panel frame (T4.2). */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <AdminShell>{children}</AdminShell>
    </AdminGate>
  );
}
