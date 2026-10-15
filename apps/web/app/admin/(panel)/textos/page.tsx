import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/admin/SectionPlaceholder';

export const metadata: Metadata = { title: 'Textos · Panel · P&P Deportes Coapa' };

/** /admin/textos: site texts arrive in T4.9. */
export default function Page() {
  return (
    <SectionPlaceholder
      id="textos"
      summary="Aquí editarás las preguntas frecuentes, la historia, cómo llegar, los datos de la asesora y el aviso de privacidad."
    />
  );
}
