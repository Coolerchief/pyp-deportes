import type { Metadata } from 'next';
import { ImagenGenerica } from '@/components/brand';
import placeholders from '@/scripts/placeholders.json';

// Development-only capture sheet: scripts/generate-placeholders.mjs screenshots each tile (T0.5).

export const metadata: Metadata = {
  title: 'Imágenes genéricas · desarrollo',
  robots: { index: false },
};

export default function GenericasPage() {
  return (
    <main className="container-page py-12 lg:py-16">
      <p className="type-eyebrow text-rojo-profundo">Desarrollo · T0.5</p>
      <h1 className="type-h1 mt-2">Imágenes genéricas</h1>
      <div className="mt-8 flex flex-wrap gap-4">
        {placeholders.categories.map(({ slug, name }) => (
          <div key={slug} data-placeholder={slug} style={{ width: placeholders.cssWidth }}>
            <ImagenGenerica category={name} />
          </div>
        ))}
      </div>
    </main>
  );
}
