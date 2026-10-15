import { type ProductStatus, productStatusLabels } from '@pyp/shared';
import { cn } from '../ui/cn';

const tones: Record<ProductStatus, string> = {
  draft: 'bg-gis text-noche border-borde-control',
  published: 'bg-exito text-blanco border-exito',
  archived: 'bg-linea text-grafito border-linea',
};

/** Borrador / Publicado / Archivado (UI/UX §9), in words and not only in color. */
export function StatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  return (
    <span
      className={cn(
        'type-caption inline-flex h-6 items-center rounded-sm border px-2 font-semibold whitespace-nowrap',
        tones[status],
        className,
      )}
    >
      {productStatusLabels[status]}
    </span>
  );
}

/** "SIN FOTO" next to a product that has none yet. */
export function NoPhotoBadge() {
  return (
    <span className="type-caption border-rojo-profundo text-rojo-profundo inline-flex h-6 items-center rounded-sm border px-2 font-semibold whitespace-nowrap">
      SIN FOTO
    </span>
  );
}
