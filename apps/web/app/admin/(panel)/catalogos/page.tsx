import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export const metadata: Metadata = { title: 'Catálogos · Panel · P&P Deportes Coapa' };

/** /admin/catalogos: sports, categories and brands arrive in T4.9. */
export default function Page() {
  return (
    <SectionPlaceholder
      id="catalogos"
      summary="Aquí ordenarás los deportes, las categorías y las marcas del catálogo."
    />
  );
}
