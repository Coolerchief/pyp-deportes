import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductsPage } from '@/components/admin/products/ProductsPage';

export const metadata: Metadata = { title: 'Productos · Panel · P&P Deportes Coapa' };

/** /admin/productos (T4.3). The filters are in the URL (useSearchParams suspends when prerendering). */
export default function Page() {
  return (
    <Suspense>
      <ProductsPage />
    </Suspense>
  );
}
