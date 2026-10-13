'use client';

import type { CatalogProduct } from '@pyp/shared';
import Image from 'next/image';
import { useState } from 'react';
import { ProductImage } from '@/components/catalog/ProductImage';
import { cx } from '@/lib/cx';
import { mediaUrl } from '@/lib/images/loader';
import type { GalleryImage } from '@/lib/product';

const MAIN_SIZES = '(min-width: 1024px) 50vw, 100vw';

type ProductGalleryProps = {
  product: Pick<CatalogProduct, 'name' | 'category' | 'image'>;
  categoryName: string;
  images: GalleryImage[];
};

/**
 * Product gallery (UI/UX §7.5): on mobile the 4:5 photos fill the width and slide sideways; on
 * desktop 88 px thumbnails sit next to the main photo. Without photos, the category's generic
 * image and "Foto próximamente".
 */
export function ProductGallery({ product, categoryName, images }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <figure className="-mx-4 sm:-mx-6 lg:mx-0">
        <ProductImage
          product={{ ...product, image: null }}
          categoryName={categoryName}
          sizes={MAIN_SIZES}
          priority
        />
        <figcaption className="type-small text-grafito-suave bg-gis px-4 py-2 text-center">
          Foto próximamente
        </figcaption>
      </figure>
    );
  }

  const photo = (image: GalleryImage, index: number, sizes: string) => (
    <div className="bg-gis relative aspect-[4/5] overflow-hidden">
      <Image
        src={mediaUrl(image.keyBase)}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={index === 0}
        className="object-cover"
      />
    </div>
  );

  return (
    <div className="-mx-4 sm:-mx-6 lg:mx-0 lg:flex lg:gap-4">
      {images.length > 1 && (
        <ul aria-label="Fotos" className="hidden w-[88px] shrink-0 flex-col gap-3 lg:flex">
          {images.map((image, index) => (
            <li key={image.keyBase}>
              <button
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                aria-current={index === selected}
                onClick={() => setSelected(index)}
                className={cx(
                  'block w-full',
                  index === selected && 'outline-noche outline-2 outline-offset-2 outline-solid',
                )}
              >
                {photo(image, index, '88px')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Mobile: every photo in a horizontal snap row. */}
      <ul className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] lg:hidden">
        {images.map((image, index) => (
          <li key={image.keyBase} className="w-full shrink-0 snap-start">
            {photo(image, index, MAIN_SIZES)}
          </li>
        ))}
      </ul>
      <div className="hidden grow lg:block">
        {photo(images[selected] ?? images[0]!, selected, MAIN_SIZES)}
      </div>
    </div>
  );
}
