import type { Metadata } from 'next';
import { ImportPage } from '@/components/admin/products/ImportPage';

export const metadata: Metadata = { title: 'Importar productos · Panel · P&P Deportes Coapa' };

/** /admin/productos/importar (T4.6): catalog file and photos in bulk by SKU. */
export default function Page() {
  return <ImportPage />;
}
