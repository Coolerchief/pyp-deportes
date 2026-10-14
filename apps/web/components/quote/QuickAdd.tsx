'use client';

import { type CatalogProduct, piecesOf, variantLabel } from '@pyp/shared';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { useQuote } from '@/lib/commerce';
import { useAddedNotice } from '@/lib/commerce/added-notice';

/**
 * "+ Cotizar" on the card of a product without choices (APP-FLOW §4.1): adds 1 piece of its
 * only variant and opens the added notice.
 */
export function QuickAddButton({
  product,
  categoryName,
}: {
  product: CatalogProduct;
  categoryName: string;
}) {
  function add() {
    const [variant] = product.variants;
    if (!variant) return;
    const label = variantLabel(variant.o1, variant.o2);
    const { skipped } = useQuote.getState().add({
      productId: product.id,
      personalize: false,
      notes: '',
      product: {
        name: product.name,
        sku: product.sku,
        slug: product.slug,
        image: product.image?.keyBase ?? null,
      },
      variants: [{ variantId: variant.id, label, quantity: 1 }],
    });
    useAddedNotice.getState().show({
      product: { ...product, categoryName },
      personalize: false,
      lines: [{ label, quantity: 1 }],
      skipped,
    });
  }
  return (
    <Button variant="outline" size="sm" onClick={add} aria-label={`Cotizar ${product.name}`}>
      + Cotizar
    </Button>
  );
}

/** "En tu cotización · 12 piezas" on a card (UI/UX §7.4), once the saved list was read. */
export function InQuoteBadge({ productId }: { productId: string }) {
  const pieces = useQuote((s) => (s.hydrated ? piecesOf(s.lines, productId) : 0));
  if (pieces === 0) return null;
  return (
    <p className="type-small text-exito flex items-center gap-1 font-semibold">
      <Check aria-hidden="true" className="size-4" />
      En tu cotización · {pieces} {pieces === 1 ? 'pieza' : 'piezas'}
    </p>
  );
}
