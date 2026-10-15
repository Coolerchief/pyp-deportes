import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProductEditorPage } from '@/components/admin/products/ProductEditor';

export const metadata: Metadata = { title: 'Nuevo producto · Panel · P&P Deportes Coapa' };

/** /admin/productos/nuevo (T4.3): a new product is saved as a draft or published at once. */
export default function Page() {
  return (
    <Suspense>
      <ProductEditorPage mode="new" />
    </Suspense>
  );
}
