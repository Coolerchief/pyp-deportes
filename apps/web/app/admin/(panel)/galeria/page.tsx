import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export const metadata: Metadata = { title: 'Galería · Panel · P&P Deportes Coapa' };

/** /admin/galeria: the gallery arrives in T4.8. */
export default function Page() {
  return (
    <SectionPlaceholder
      id="galeria"
      summary="Aquí subirás las fotos de equipos con su autorización para mostrarlas en el sitio."
    />
  );
}
