import type { Metadata } from 'next';
import { Demo } from './Demo';

// Development-only sheet of the base components (T0.4).

export const metadata: Metadata = { title: 'Componentes · desarrollo', robots: { index: false } };

export default function ComponentesPage() {
  return (
    <main className="container-page py-12 lg:py-16">
      <p className="type-eyebrow text-rojo-profundo">Desarrollo · T0.4</p>
      <h1 className="type-h1 mt-2">Componentes base</h1>
      <Demo />
    </main>
  );
}
