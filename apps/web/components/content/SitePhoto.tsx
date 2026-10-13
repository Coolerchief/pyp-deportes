import type { SettingsJson } from '@pyp/shared';
import Image from 'next/image';
import { DobleDiagonal } from '@/components/brand';
import { cx } from '@/lib/cx';
import { mediaUrl } from '@/lib/images/loader';

export type SiteMediaSlot = keyof SettingsJson['siteMedia'];

/** What the placeholder says while a slot has no photo (UI/UX §6). */
export const SLOT_MARKERS: Record<SiteMediaSlot, string> = {
  home_hero: '[FOTO DE PORTADA]',
  uniforms_hero: '[FOTO DE UNIFORMES]',
  technique_sublimacion: '[FOTO DE MUESTRA]',
  technique_vinil: '[FOTO DE MUESTRA]',
  technique_bordado: '[FOTO DE MUESTRA]',
  store_front: '[FOTO DE LA TIENDA]',
  store_workshop: '[FOTO DEL TALLER]',
  advisor: '[FOTO DE LA ASESORA]',
};

type SitePhotoProps = {
  media: SettingsJson['siteMedia'][SiteMediaSlot];
  /** Marker text when there is no photo; defaults to the slot's. */
  marker: string;
  sizes: string;
  priority?: boolean;
  /** Size and shape of the box (it fills it): "h-full", "aspect-[4/3]"… */
  className?: string;
};

/**
 * A photo of the site (`site_media`, TRD §6.2) from R2, or its placeholder: gis with the
 * DobleDiagonal in concreto and the slot's name in brackets. Decorative when empty.
 */
export function SitePhoto({ media, marker, sizes, priority, className }: SitePhotoProps) {
  if (media) {
    return (
      <div className={cx('bg-gis relative overflow-hidden', className)}>
        <Image
          src={mediaUrl(media.keyBase)}
          alt={media.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cx(
        'bg-gis text-grafito-suave flex flex-col items-center justify-center gap-2 text-center',
        className,
      )}
    >
      <DobleDiagonal height={28} className="text-concreto" />
      <span className="type-caption tracking-wider whitespace-pre-line">{marker}</span>
    </div>
  );
}
