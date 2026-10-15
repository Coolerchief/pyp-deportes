import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequestsPage } from '@/components/admin/requests/RequestsPage';

export const metadata: Metadata = { title: 'Solicitudes · Panel · P&P Deportes Coapa' };

/** /admin/solicitudes (T4.7). The filters are in the URL (useSearchParams suspends when prerendering). */
export default function Page() {
  return (
    <Suspense>
      <RequestsPage />
    </Suspense>
  );
}
