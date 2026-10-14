import {
  type CatalogJson,
  groupQuoteLines,
  type QuoteLine,
  type QuoteMessageInput,
  type QuoteRequester,
} from '@pyp/shared';

/**
 * The message input (TRD §6.5) from the quote list and the form: products grouped as the list
 * shows them, and each variant's SKU taken from catalog.json when it is loaded (the list keeps
 * only the product's SKU).
 */
export function quoteMessageInput(
  lines: readonly QuoteLine[],
  requester: QuoteRequester,
  folio: string | null,
  catalog: CatalogJson | null = null,
): QuoteMessageInput {
  const variantSku = new Map(
    catalog?.products.flatMap((p) => p.variants.map((v) => [v.id, v.sku] as const)) ?? [],
  );
  return {
    folio,
    customer: {
      name: requester.customer.name,
      type: requester.customer.type,
      organization: requester.customer.organization,
    },
    neededBy: requester.neededBy,
    deliveryMethod: requester.deliveryMethod,
    requiresInvoice: requester.requiresInvoice,
    note: requester.note,
    products: groupQuoteLines(lines).map((group) => ({
      name: group.snapshot.name,
      sku: group.snapshot.sku,
      personalize: group.personalize,
      notes: group.notes,
      lines: group.lines.map((line) => ({
        label: line.snapshot.variantLabel,
        quantity: line.quantity,
        sku: variantSku.get(line.variantId),
      })),
    })),
  };
}
