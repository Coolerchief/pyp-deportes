import type { CatalogProduct } from '@pyp/shared';
import Image from 'next/image';
import { ImagenGenerica } from '@/components/brand';
import { cx } from '@/lib/cx';
import { mediaUrl } from '@/lib/images/loader';
import placeholders from '@/scripts/placeholders.json';

const GENERATED = new Set(placeholders.categories.map((c) => c.slug));

type ProductImageProps = {
  product: Pick<CatalogProduct, 'name' | 'category' | 'image'>;
  /** Category name, for the CSS stand-in when its generic image was never generated. */
  categoryName: string;
  /** `sizes` of the slot, e.g. "(min-width: 1024px) 25vw, 50vw" for a card. */
  sizes: string;
  priority?: boolean;
  className?: string;
};

/**
 * 4:5 product image (UI/UX §6): the photo from R2 through the width loader, or the generic image
 * of its category (`/img/placeholder/<category>.webp`, decorative). A category added after the
 * generic images were generated falls back to the same design drawn in CSS.
 */
export function ProductImage({
  product,
  categoryName,
  sizes,
  priority,
  className,
}: ProductImageProps) {
  const frame = cx('bg-gis relative aspect-[4/5] overflow-hidden', className);
  if (product.image) {
    return (
      <div className={frame}>
        <Image
          src={mediaUrl(product.image.keyBase)}
          alt={product.image.alt || product.name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-[250ms] ease-brand motion-safe:group-hover:scale-[1.03]"
        />
      </div>
    );
  }
  if (!GENERATED.has(product.category)) {
    return <ImagenGenerica category={categoryName} className={className} />;
  }
  return (
    <div className={frame}>
      <Image
        src={`/img/placeholder/${product.category}.webp`}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        unoptimized
        className="object-cover transition-transform duration-[250ms] ease-brand motion-safe:group-hover:scale-[1.03]"
      />
    </div>
  );
}
