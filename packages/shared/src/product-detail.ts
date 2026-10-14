// Product page rules (T2.7, UI/UX §7.5): the specifications table and the related products.

import type { CatalogJson, CatalogProduct, CatalogVariant } from './catalog.ts';
import { type Technique, techniqueLabels } from './labels.ts';
import { sortProducts } from './listing.ts';

/** How many related products the page shows (4 columns on desktop, a carousel on mobile). */
export const RELATED_LIMIT = 4;

const PLURALS: Record<string, string> = {
  talla: 'Tallas',
  tamaño: 'Tamaños',
  peso: 'Pesos',
  color: 'Colores',
};

/** "Talla" → "Tallas", "Tamaño" → "Tamaños", "Peso" → "Pesos" (spec labels and headings). */
export function pluralLabel(word: string): string {
  const lower = word.trim().toLowerCase();
  if (PLURALS[lower]) return PLURALS[lower];
  const plural = /[aeiouáéíóú]$/.test(lower) ? `${lower}s` : `${lower}es`;
  return plural.charAt(0).toUpperCase() + plural.slice(1);
}

/** Distinct option values in variant order: { o1: ['CH', 'M'], o2: ['Rojo', 'Azul'] }. */
export function optionValues(variants: readonly Pick<CatalogVariant, 'o1' | 'o2'>[]): {
  o1: string[];
  o2: string[];
} {
  const distinct = (values: (string | null)[]) => [
    ...new Set(values.filter((v): v is string => v !== null && v !== '')),
  ];
  return { o1: distinct(variants.map((v) => v.o1)), o2: distinct(variants.map((v) => v.o2)) };
}

const list = (values: string[]) =>
  new Intl.ListFormat('es', { type: 'conjunction' }).format(values);

export type SpecRow = { label: string; value: string };

type SpecSource = Pick<CatalogProduct, 'brand' | 'option1Name' | 'option2Name' | 'variants'> & {
  customizable: boolean;
  techniques: readonly Technique[];
  colorNote: string | null;
  minSuggestedQty: number | null;
  /** The product's own specifications from the admin (products.specs). */
  specs: readonly SpecRow[];
};

/**
 * Specifications table (UI/UX §7.5): what the data already says (brand, sizes, colors,
 * techniques, suggested order) and then the specifications written in the admin. A label the
 * admin wrote wins over the derived row with the same name.
 */
export function productSpecs(product: SpecSource): SpecRow[] {
  const { o1, o2 } = optionValues(product.variants);
  const derived: SpecRow[] = [{ label: 'Marca', value: product.brand.name }];
  if (o1.length) derived.push({ label: pluralLabel(product.option1Name), value: list(o1) });
  if (o2.length) {
    derived.push({ label: pluralLabel(product.option2Name ?? 'Color'), value: list(o2) });
  } else if (product.colorNote?.trim()) {
    derived.push({ label: 'Colores', value: product.colorNote.trim() });
  }
  if (product.customizable && product.techniques.length) {
    derived.push({
      label: 'Técnicas',
      value: product.techniques.map((t) => techniqueLabels[t]).join(' · '),
    });
  }
  if (product.minSuggestedQty) {
    derived.push({ label: 'Pedido sugerido', value: `Desde ${product.minSuggestedQty} piezas` });
  }
  const own = new Set(product.specs.map((s) => s.label.trim().toLowerCase()));
  return [...derived.filter((row) => !own.has(row.label.toLowerCase())), ...product.specs];
}

/**
 * Related products (UI/UX §7.5), never the product itself:
 *  · customizable ("Completa el uniforme"): pieces for the same sport from other subcategories,
 *    customizable ones first;
 *  · otherwise ("También te puede interesar"): the same subcategory, then the same category,
 *    then the same sport.
 * Each group keeps the default order (Destacados).
 */
export function relatedProducts(
  catalog: CatalogJson,
  product: CatalogProduct,
  limit = RELATED_LIMIT,
): CatalogProduct[] {
  const others = sortProducts(catalog.products.filter((p) => p.id !== product.id));
  const sharesSport = (p: CatalogProduct) => p.sports.some((s) => product.sports.includes(s));
  const groups: CatalogProduct[][] = product.customizable
    ? [
        others.filter(
          (p) => sharesSport(p) && p.subcategory !== product.subcategory && p.customizable,
        ),
        others.filter((p) => sharesSport(p) && p.subcategory !== product.subcategory),
        others.filter((p) => p.category === product.category),
      ]
    : [
        others.filter((p) => product.subcategory !== null && p.subcategory === product.subcategory),
        others.filter((p) => p.category === product.category),
        others.filter(sharesSport),
      ];
  const picked = new Map<string, CatalogProduct>();
  for (const group of groups) {
    for (const p of group) {
      if (picked.size === limit) break;
      picked.set(p.id, p);
    }
  }
  return [...picked.values()];
}
