import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export const metadata: Metadata = { title: 'Ajustes · Panel · P&P Deportes Coapa' };

/** /admin/ajustes: settings and staff arrive in T4.9 (admin only). */
export default function Page() {
  return (
    <SectionPlaceholder
      id="ajustes"
      summary="Aquí cambiarás el WhatsApp de ventas, los datos de la tienda y el personal que entra al panel."
    />
  );
}
