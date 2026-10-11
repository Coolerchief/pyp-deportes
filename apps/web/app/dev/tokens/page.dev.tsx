import type { Metadata } from 'next';
import { TokenValue } from './TokenValue';

// Development-only token sheet (T0.2): colors and the 13 text styles from design/tokens/tokens.css.

export const metadata: Metadata = { title: 'Tokens · desarrollo', robots: { index: false } };

const colors = [
  { name: 'rojo', swatch: 'bg-rojo', usage: 'CTA principal, placas, acentos, diagonales' },
  { name: 'rojo-profundo', swatch: 'bg-rojo-profundo', usage: 'Texto rojo pequeño, hover del CTA' },
  { name: 'noche', swatch: 'bg-noche', usage: 'Texto principal, header, footer' },
  { name: 'lima', swatch: 'bg-lima', usage: 'Solo acento: NUEVO, contador, foco' },
  { name: 'gis', swatch: 'bg-gis', usage: 'Fondo claro de secciones y fotos' },
  { name: 'blanco', swatch: 'bg-blanco', usage: 'Fondo de página y tarjetas' },
  { name: 'grafito', swatch: 'bg-grafito', usage: 'Texto secundario' },
  { name: 'grafito-suave', swatch: 'bg-grafito-suave', usage: 'Texto terciario, ayudas' },
  { name: 'concreto', swatch: 'bg-concreto', usage: 'Líneas decorativas (no texto)' },
  { name: 'borde-control', swatch: 'bg-borde-control', usage: 'Borde de inputs y steppers' },
  { name: 'linea', swatch: 'bg-linea', usage: 'Divisores suaves' },
  { name: 'exito', swatch: 'bg-exito', usage: 'Confirmaciones' },
  { name: 'whatsapp', swatch: 'bg-whatsapp', usage: 'Solo el botón de WhatsApp' },
];

const textStyles = [
  {
    name: 'display',
    className: 'type-display',
    size: '48 / 80 px',
    sample: 'Tu equipo empieza aquí.',
  },
  { name: 'h1', className: 'type-h1', size: '40 / 56 px', sample: 'Uniformes de fútbol' },
  { name: 'h2', className: 'type-h2', size: '30 / 40 px', sample: 'Entra por tu deporte' },
  { name: 'h3', className: 'type-h3', size: '22 / 26 px', sample: 'Uniformes a tu medida' },
  { name: 'h4', className: 'type-h4', size: '18 / 20 px', sample: 'Especificaciones' },
  {
    name: 'eyebrow',
    className: 'type-eyebrow text-rojo-profundo',
    size: '13 px',
    sample: 'Uniformes · Fútbol',
  },
  { name: 'button', className: 'type-button', size: '19 px', sample: 'Agregar a mi cotización' },
  { name: 'number', className: 'type-number', size: '28 / 36 px', sample: '42 piezas' },
  {
    name: 'body-lg',
    className: 'type-body-lg',
    size: '18 px',
    sample: 'Uniformes a la medida y todo para entrenar.',
  },
  {
    name: 'body',
    className: 'type-body',
    size: '16 px',
    sample: 'Elige tela, colores y diseño. Te ayudamos a armar el uniforme completo de tu equipo.',
  },
  {
    name: 'body-strong',
    className: 'type-body-strong',
    size: '16 px',
    sample: 'Balón Fútbol Molten #5',
  },
  {
    name: 'small',
    className: 'type-small text-grafito-suave',
    size: '14 px',
    sample: '6 tallas · 3 colores',
  },
  {
    name: 'caption',
    className: 'type-caption',
    size: '12 px',
    sample: 'Consulta disponibilidad de tallas.',
  },
];

export default function TokensPage() {
  return (
    <main className="container-page py-12 lg:py-16">
      <p className="type-eyebrow text-rojo-profundo">Desarrollo · T0.2</p>
      <h1 className="type-h1 mt-2">Tokens de marca</h1>

      <section aria-labelledby="colores" className="mt-12">
        <h2 id="colores" className="type-h2">
          Color
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 lg:gap-6">
          {colors.map((color) => (
            <li key={color.name} className="bg-blanco shadow-card">
              <div className={`${color.swatch} border-linea aspect-[4/3] border-b`} />
              <div className="flex flex-col gap-1 p-3">
                <span className="type-body-strong">{color.name}</span>
                <TokenValue name={`--color-${color.name}`} />
                <span className="type-caption text-grafito">{color.usage}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tipografia" className="mt-12 lg:mt-16">
        <h2 id="tipografia" className="type-h2">
          Tipografía
        </h2>
        <ul className="mt-6">
          {textStyles.map((style) => (
            <li
              key={style.name}
              className="border-linea flex flex-col gap-2 border-b py-4 lg:flex-row lg:items-baseline lg:gap-6"
            >
              <span className="type-small text-grafito-suave lg:w-48 lg:shrink-0">
                <code>{style.name}</code> · {style.size}
              </span>
              <span className={style.className}>{style.sample}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="superficies" className="mt-12 lg:mt-16">
        <h2 id="superficies" className="type-h2">
          Superficies y foco
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="bg-gis p-4">
            <p className="type-h4">Gis</p>
            <p className="type-small text-grafito">Fondo de secciones</p>
          </div>
          <div className="bg-noche text-blanco p-4">
            <p className="type-eyebrow text-lima">Sobre noche</p>
            <p className="type-h4">Noche</p>
          </div>
          <div className="bg-blanco shadow-float p-4">
            <p className="type-h4">shadow-float</p>
            <button type="button" className="type-button bg-rojo text-blanco mt-3 px-4 py-3">
              Prueba el foco
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
