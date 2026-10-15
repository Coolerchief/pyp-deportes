'use client';

import { roleLabels } from '@/lib/admin/access';
import { useAdminSession } from './AdminGate';

/** Panel home (T4.1): a greeting; solicitudes, productos sin foto and "Publicar" come in T4.2. */
export function AdminHome() {
  const { staff } = useAdminSession();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="type-h2 text-noche">Hola, {staff.fullName}</h1>
      <p className="type-body text-grafito">
        Entraste como {roleLabels[staff.role].toLowerCase()}. Aquí verás las solicitudes nuevas y
        los cambios por publicar.
      </p>
    </section>
  );
}
