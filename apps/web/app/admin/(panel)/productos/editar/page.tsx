import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductEditorPage } from '@/components/admin/products/ProductEditor';

export const metadata: Metadata = { title: 'Editar producto · Panel · P&P Deportes Coapa' };

/**
 * /admin/productos/editar?id=… (T4.3). A query parameter and not /productos/[id]: the export is
 * static and the panel's products are only known in the browser.
 */
export default function Page() {
  return (
    <Suspense>
      <ProductEditorPage mode="edit" />
    </Suspense>
  );
}
