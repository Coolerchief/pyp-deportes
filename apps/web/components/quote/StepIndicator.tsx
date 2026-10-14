import { placaOffset } from '@/components/brand';
import { cx } from '@/lib/cx';

const STEPS = ['Tu lista', 'Tus datos', 'Enviar'];

/**
 * StepIndicator (UI/UX §7.6): three plates "1 · Tu lista", "2 · Tus datos", "3 · Enviar".
 * Current noche, done lima, pending gis.
 */
export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const offset = placaOffset(32);
  return (
    <nav aria-label="Pasos">
      <ol className="flex gap-1.5">
        {STEPS.map((label, index) => {
          const step = index + 1;
          const state = step === current ? 'current' : step < current ? 'done' : 'pending';
          return (
            <li
              key={label}
              aria-current={state === 'current' ? 'step' : undefined}
              style={{ ['--placa-o' as string]: `${offset}px`, paddingInline: 10 + offset }}
              className={cx(
                'placa type-chip inline-flex h-8 items-center whitespace-nowrap',
                state === 'current' && 'bg-noche text-blanco font-semibold',
                state === 'done' && 'bg-lima text-noche font-semibold',
                state === 'pending' && 'bg-gis text-grafito-suave',
              )}
            >
              {step} · {label}
              {state === 'done' && <span className="sr-only"> (completado)</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
