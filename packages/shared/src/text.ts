// Text normalization shared by search (MiniSearch in the browser), the importer and the database.
// Mirrors the SQL helpers: normalize_search_text, slugify, variant_sku and variant_label.

/** Lowercase without accents or diacritics: 'Balón Ñandú' → 'balon nandu'. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** URL slug: 'Ropa Deportiva', 'P&P' → 'ropa-deportiva', 'p-p'. */
export function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function skuPart(value: string | null | undefined): string {
  return slugify(value ?? '').toUpperCase();
}

/** Variant SKU: {sku}-{OPTION1}-{OPTION2} → 'BAL-005-5-BLANCO-ROJO' (§4.3). */
export function variantSku(
  productSku: string,
  option1?: string | null,
  option2?: string | null,
): string {
  return [productSku.toUpperCase(), skuPart(option1), skuPart(option2)].filter(Boolean).join('-');
}

/** Label shown on quote lines: 'M', '#5 · Blanco/Rojo', or null for the default variant. */
export function variantLabel(option1?: string | null, option2?: string | null): string | null {
  const parts = [option1, option2].filter((part): part is string => !!part && part.length > 0);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** Keeps only digits: '55 1234-5678' → '5512345678'. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}
