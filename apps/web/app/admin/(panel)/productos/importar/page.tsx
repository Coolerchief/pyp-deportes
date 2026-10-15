import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export const metadata: Metadata = { title: 'Importar productos · Panel · P&P Deportes Coapa' };

/** /admin/productos/importar: the importer arrives in T4.6. */
export default function Page() {
  return (
    <SectionPlaceholder
      id="productos"
      title="Importar productos"
      summary="Aquí subirás un archivo CSV o Excel con el catálogo, verás los errores por fila antes de importar y subirás fotos en lote por SKU."
    />
  );
}
