import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export const metadata: Metadata = { title: 'Fotos del sitio · Panel · P&P Deportes Coapa' };

/** /admin/fotos: site photos arrive in T4.9. */
export default function Page() {
  return (
    <SectionPlaceholder
      id="fotos"
      summary="Aquí cambiarás la portada, la foto de uniformes, las muestras, la tienda, el taller y la asesora."
    />
  );
}
