import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequestDetailPage } from '@/components/admin/requests/RequestDetailPage';

export const metadata: Metadata = { title: 'Solicitud · Panel · P&P Deportes Coapa' };

/** /admin/solicitudes/detalle?id=… (T4.7): a query parameter because the export is static. */
export default function Page() {
  return (
    <Suspense>
      <RequestDetailPage />
    </Suspense>
  );
}
