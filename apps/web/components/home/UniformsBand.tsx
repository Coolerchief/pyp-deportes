import { Check } from 'lucide-react';
import { logoSrc } from '@/components/brand';
import { Button } from '@/components/ui';
import { cx } from '@/lib/cx';
import { ROUTES } from '@/lib/navigation';

const POINTS = [
  'Jersey, short y medias del mismo proveedor',
  'Escudo, nombre y número en sublimación, vinil o bordado',
  'Tallas infantiles y de adulto, con reposiciones',
];
const PIECES = ['Jersey', 'Short', 'Medias'];
const OFFSETS = ['mt-0', 'mt-10', 'mt-20'];

/**
 * "Uniformes a tu medida" band on Inicio (UI/UX §8.1): noche with PatronCancha (not rojo: small
 * white text fails contrast there), the key message, three checks and "Conoce el servicio". On
 * desktop, three staggered pieces on the right.
 */
export function UniformsBand() {
  return (
    <section className="cancha bg-noche text-blanco">
      <div className="container-page flex flex-col gap-6 py-12 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-20">
        <div className="flex flex-col gap-5">
          <p className="type-eyebrow text-lima">Uniformes a tu medida</p>
          <h2 className="type-h1">
            Tu nombre.
            <br className="lg:hidden" /> Tu número.
            <br />
            <span className="text-lima">Tu equipo.</span>
          </h2>
          <ul className="flex flex-col gap-2.5">
            {POINTS.map((point) => (
              <li key={point} className="type-body flex gap-2.5">
                <Check aria-hidden="true" className="text-lima mt-0.5 size-5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          <div>
            <Button variant="primary" href={ROUTES.uniforms}>
              Conoce el servicio
            </Button>
          </div>
        </div>
        <ol aria-hidden="true" className="hidden h-[340px] items-start gap-4 lg:flex">
          {PIECES.map((piece, index) => (
            <li key={piece} className={cx('flex w-1/3 flex-col gap-2', OFFSETS[index])}>
              <div className="border-blanco/30 bg-noche cancha relative flex aspect-[4/5] items-center justify-center border">
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
                <img src={logoSrc('monograma', 'mono-blanco')} alt="" className="w-[30%]" />
                <span className="type-badge text-lima absolute inset-x-0 bottom-3 text-center">
                  {piece}
                </span>
              </div>
              <span className="type-eyebrow">
                0{index + 1} · {piece}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
