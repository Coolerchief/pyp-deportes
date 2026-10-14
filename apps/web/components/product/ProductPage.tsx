import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ProductCard, VolumeNote } from '@/components/catalog';
import { chipStyle } from '@/components/catalog/chip-style';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { WhatsAppGlyph } from '@/components/layout/WhatsAppGlyph';
import { Badge, Button } from '@/components/ui';
import type { ProductPageData } from '@/lib/product';
import { ProductGallery } from './ProductGallery';
import { VariantMatrix } from './VariantMatrix';

/**
 * Product page (T2.7, UI/UX §7.5). Customizable products get the full page ("Completa el
 * uniforme", team shortcuts and personalization), the rest the simple one ("También te puede
 * interesar"). VariantMatrix captures the quantities and adds them to the quote.
 */
export function ProductPage({ data }: { data: ProductPageData }) {
  const { product } = data;
  const newIds = new Set(data.newIds);
  return (
    <div className="container-page flex flex-col gap-10 pt-3 pb-[calc(4rem+88px)] lg:gap-16 lg:pt-5 lg:pb-20">
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped: safe inside a script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data.jsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="flex flex-col gap-4 lg:gap-6">
        <Breadcrumbs items={data.breadcrumbs} />
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="lg:col-span-7">
            <ProductGallery
              product={product}
              categoryName={data.categoryName}
              images={data.images}
            />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-5">
            <section className="flex flex-col gap-2">
              {data.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {data.badges.map((badge) => (
                    <Badge key={badge.variant} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              )}
              <span className="type-eyebrow text-grafito-suave">{product.brand.name}</span>
              <h1 className="type-h1 break-words">{product.name}</h1>
              <span className="type-small text-grafito-suave">SKU {product.sku}</span>
              {data.shortDescription && (
                <p className="type-body-lg text-grafito">{data.shortDescription}</p>
              )}
            </section>

            <VariantMatrix
              product={product}
              categoryName={data.categoryName}
              customizable={data.customizable}
            />

            <Button
              variant="whatsapp"
              size="lg"
              href={data.askUrl}
              external
              fullWidth
              icon={<WhatsAppGlyph size={22} />}
            >
              Preguntar por este producto
            </Button>

            {data.description && (
              <div className="type-body text-grafito whitespace-pre-line">{data.description}</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-12">
        <section className="flex flex-col gap-4 lg:col-span-7">
          <h2 className="type-h3">Especificaciones</h2>
          <dl className="border-linea border-t">
            {data.specs.map((spec) => (
              <div
                key={spec.label}
                className="border-linea grid grid-cols-[40%_1fr] gap-4 border-b py-3"
              >
                <dt className="text-grafito-suave type-small">{spec.label}</dt>
                <dd className="type-body">{spec.value}</dd>
              </div>
            ))}
          </dl>
          {data.sports.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-small text-grafito-suave">Para:</span>
              {data.sports.map((sport) => {
                const { className, style } = chipStyle(false);
                return (
                  <Link key={sport.href} href={sport.href} className={className} style={style}>
                    {sport.label}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <div className="lg:col-span-5">
          <VolumeNote whatsappUrl={data.whatsappUrl} stacked />
        </div>
      </div>

      {data.related.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <h2 className="type-h2">{data.relatedTitle}</h2>
            <Link
              href={data.relatedHref}
              className="text-rojo-profundo inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold no-underline"
            >
              Ver todo
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
            {data.related.map((related) => (
              <li key={related.id} className="w-[180px] shrink-0 snap-start lg:w-auto">
                <ProductCard
                  product={related}
                  categoryName={data.categoryNames[related.category] ?? related.category}
                  isNew={newIds.has(related.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
