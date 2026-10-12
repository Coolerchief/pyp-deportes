import { cx } from '@/lib/cx';
import { logoSrc } from './Logo';

type ImagenGenericaProps = {
  /** Category name shown in lima; it comes from the categories table, never hard-coded. */
  category: string;
  className?: string;
};

/**
 * 4:5 stand-in for a product without photos: noche with PatronCancha, white monogram at 30%
 * of the width and the category name. Decorative: the product name is already next to it.
 */
export function ImagenGenerica({ category, className }: ImagenGenericaProps) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'cancha bg-noche relative flex aspect-[4/5] items-center justify-center overflow-hidden',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, sized by percentage */}
      <img src={logoSrc('monograma', 'mono-blanco')} alt="" className="w-[30%]" />
      <span className="type-eyebrow text-lima absolute inset-x-0 bottom-4 px-2 text-center">
        {category}
      </span>
    </div>
  );
}
