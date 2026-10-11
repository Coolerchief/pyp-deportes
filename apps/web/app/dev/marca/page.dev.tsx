import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  CorteA13,
  DobleDiagonal,
  ImagenGenerica,
  Logo,
  type LogoTone,
  type LogoVariant,
  PatronCancha,
  Placa,
} from '@/components/brand';

// Development-only sheet of the brand components (T0.3). Sample names mirror
// docs/data/sitio-actual.md §3; the real ones come from the database.

export const metadata: Metadata = { title: 'Marca · desarrollo', robots: { index: false } };

const categories = [
  'Uniformes',
  'Balones',
  'Ropa deportiva',
  'Material de entrenamiento',
  'Protecciones',
  'Box y combate',
  'Fitness y gimnasio',
  'Natación',
  'Accesorios y arbitraje',
  'Primeros auxilios',
];

const logoSurfaces: { tone: LogoTone; surface: string; text: string; label: string }[] = [
  { tone: 'positivo', surface: 'bg-gis', text: 'text-noche', label: 'Positivo · claro' },
  { tone: 'negativo', surface: 'bg-noche', text: 'text-blanco', label: 'Negativo · oscuro' },
  { tone: 'mono-blanco', surface: 'bg-rojo', text: 'text-blanco', label: 'Mono blanco · rojo' },
  { tone: 'mono-noche', surface: 'bg-lima', text: 'text-noche', label: 'Mono noche · lima' },
];

const variants: LogoVariant[] = ['horizontal', 'vertical', 'monograma'];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12 lg:mt-16">
      <h2 id={id} className="type-h2 flex items-center gap-3">
        <DobleDiagonal height={28} className="text-rojo" />
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function MarcaPage() {
  return (
    <main className="container-page py-12 lg:py-16">
      <p className="type-eyebrow text-rojo-profundo">Desarrollo · T0.3</p>
      <h1 className="type-h1 mt-2">Componentes de marca</h1>

      <Section id="logo" title="Logo">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {logoSurfaces.map(({ tone, surface, text, label }) => (
            <div key={tone} className={`${surface} flex flex-col items-start gap-6 p-6`}>
              {variants.map((variant) => (
                <Logo
                  key={variant}
                  variant={variant}
                  tone={tone}
                  width={variant === 'horizontal' ? 160 : undefined}
                />
              ))}
              <p className={`type-caption ${text}`}>{label}</p>
            </div>
          ))}
        </div>
        <p className="type-small text-grafito-suave mt-3">
          Tamaños mínimos: horizontal 120 px · vertical 80 px · monograma 32 px.
        </p>
      </Section>

      <Section id="placa" title="Placa">
        <div className="flex flex-wrap items-center gap-4">
          <Placa height={24} className="type-eyebrow bg-lima text-noche px-3.5">
            Nuevo
          </Placa>
          <Placa height={24} className="type-eyebrow bg-noche text-blanco px-3.5">
            Personalizable
          </Placa>
          <Placa height={36} className="type-button bg-noche text-blanco px-5">
            Fútbol
          </Placa>
          <Placa height={48} className="type-button bg-rojo text-blanco px-9">
            Ver catálogo
          </Placa>
          <Placa height={56} className="type-button bg-whatsapp text-noche px-9">
            Cotiza por WhatsApp
          </Placa>
        </div>
      </Section>

      <Section id="doble-diagonal" title="Doble diagonal">
        <div className="flex flex-wrap items-end gap-6">
          <DobleDiagonal height={24} className="text-rojo" />
          <DobleDiagonal height={40} className="text-rojo" />
          <span className="bg-noche inline-flex gap-4 p-4">
            <DobleDiagonal height={40} className="text-lima" />
            <DobleDiagonal height={40} className="text-blanco" />
          </span>
          <span className="bg-gis inline-flex gap-4 p-4">
            <DobleDiagonal height={40} className="text-noche" />
            <DobleDiagonal height={64} className="text-concreto" />
          </span>
        </div>
      </Section>

      <Section id="patron-cancha" title="Patrón cancha">
        <div className="grid gap-4 sm:grid-cols-2">
          <PatronCancha className="text-blanco p-8">
            <p className="type-h3">Sobre noche</p>
          </PatronCancha>
          <PatronCancha tone="rojo" className="text-blanco p-8">
            <p className="type-h3">Sobre rojo</p>
          </PatronCancha>
        </div>
      </Section>

      <Section id="corte" title="Corte a 13°">
        <CorteA13 className="-mx-4 h-[210px] sm:mx-0 lg:h-[420px]">
          <div className="bg-gis text-grafito flex h-full flex-col items-center justify-center gap-2">
            <DobleDiagonal height={28} className="text-borde-control" />
            <span className="type-small">[FOTO DE PORTADA]</span>
          </div>
        </CorteA13>
        <p className="type-small text-grafito-suave mt-3">
          Móvil: borde superior a ~7°. Escritorio: lado izquierdo a 13°. Máximo uno por pantalla.
        </p>
      </Section>

      <Section id="imagen-generica" title="Imagen genérica">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5 lg:gap-6">
          {categories.map((category) => (
            <li key={category}>
              <ImagenGenerica category={category} />
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
