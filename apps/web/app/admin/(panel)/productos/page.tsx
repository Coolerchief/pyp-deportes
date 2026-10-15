import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export const metadata: Metadata = { title: 'Productos · Panel · P&P Deportes Coapa' };

/** /admin/productos: products arrive in T4.3–T4.6. */
export default function Page() {
  return (
    <SectionPlaceholder
      id="productos"
      summary="Aquí darás de alta, editarás, publicarás y archivarás productos, con sus tallas, colores y fotos, y podrás importar el catálogo desde un archivo."
    />
  );
}
