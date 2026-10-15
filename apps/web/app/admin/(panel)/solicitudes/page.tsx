import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export const metadata: Metadata = { title: 'Solicitudes · Panel · P&P Deportes Coapa' };

/** /admin/solicitudes: the requests inbox arrives in T4.7. */
export default function Page() {
  return (
    <SectionPlaceholder
      id="solicitudes"
      summary="Aquí verás cada solicitud con su folio, la abrirás para responder por WhatsApp y cambiarás su estado."
    />
  );
}
