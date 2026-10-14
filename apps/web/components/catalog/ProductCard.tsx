import { type CatalogProduct, hasVariantChoice, productBadges } from '@pyp/shared';
import Link from 'next/link';
import { Badge, Button, Skeleton } from '@/components/ui';
import { InQuoteBadge, QuickAddButton } from '@/components/quote/QuickAdd';
import { ROUTES } from '@/lib/navigation';
import { PriceSlot } from './PriceSlot';
import { ProductImage } from './ProductImage';

export const CARD_SIZES = '(min-width: 1024px) 25vw, 50vw';

type ProductCardProps = {
  product: CatalogProduct;
  /** Name of the product's category (generic image stand-in). */
  categoryName: string;
  /** "Nuevo" badge (newProductIds in @pyp/shared decides it once per build). */
  isNew?: boolean;
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
};

/**
 * Product card (UI/UX §7.4): 4:5 image with up to two badges, brand, name (two lines), meta,
 * the price slot (empty while the site shows no prices) and one action. The whole card links
 * to the product page; with choices the action is "Ver tallas", without them "+ Cotizar" (adds
 * one piece). "En tu cotización" appears once the product is in the quote list.
 */
export function ProductCard({
  product,
  categoryName,
  isNew = false,
  priority,
  headingLevel: Heading = 'h3',
}: ProductCardProps) {
  const href = ROUTES.product(product.slug);
  const badges = productBadges(product, isNew);
  const choice = hasVariantChoice(product);

  return (
    <article className="group flex flex-col gap-2">
      <Link href={href} className="text-noche flex flex-col gap-1 no-underline">
        <div className="relative">
          <ProductImage
            product={product}
            categoryName={categoryName}
            sizes={CARD_SIZES}
            priority={priority}
          />
          {badges.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {badges.map((badge) => (
                <Badge key={badge.variant} variant={badge.variant}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <span className="type-eyebrow text-grafito-suave mt-1.5 text-[12px]">
          {product.brand.name}
        </span>
        <Heading className="type-body-strong line-clamp-2 leading-[1.3] group-hover:underline">
          {product.name}
        </Heading>
        {product.meta && <span className="type-small text-grafito-suave">{product.meta}</span>}
        <PriceSlot />
      </Link>
      <InQuoteBadge productId={product.id} />
      <div>
        {choice ? (
          <Button
            variant="outline"
            size="sm"
            href={href}
            aria-label={`Ver tallas de ${product.name}`}
          >
            Ver tallas
          </Button>
        ) : (
          <QuickAddButton product={product} categoryName={categoryName} />
        )}
      </div>
    </article>
  );
}

/** Loading card with the same proportions (UI/UX §7.4): gis image, linea lines. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <Skeleton tone="gis" className="aspect-[4/5]" />
      <Skeleton tone="linea" className="mt-1.5 h-3 w-1/4" />
      <Skeleton tone="linea" className="h-4 w-4/5" />
      <Skeleton tone="linea" className="h-3.5 w-1/2" />
      <Skeleton tone="linea" className="mt-1 h-10 w-28" />
    </div>
  );
}
