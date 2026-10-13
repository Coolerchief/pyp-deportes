// Groups of the filter panel (UI/UX §7.4 FilterPanel) from the counts of @pyp/shared.

import {
  audienceLabels,
  type FacetCounts,
  type FilterKey,
  type ListingFilters,
  type ListingScope,
} from '@pyp/shared';

export type FacetOption = { value: string; label: string; count: number };
export type FacetGroup = { key: FilterKey; title: string; options: FacetOption[] };

/** Names of sports, categories and brands by slug (audiences have fixed labels). */
export type FacetLabels = Record<'deporte' | 'categoria' | 'marca', Record<string, string>>;

const TITLES: Record<FilterKey, string> = {
  deporte: 'Deporte',
  categoria: 'Categoría',
  marca: 'Marca',
  para: 'Para',
};

/** Counts as plain arrays, so the server can hand the first ones to the browser. */
export type SerializedCounts = Record<FilterKey, [string, number][]> & { personalizable: number };

export function serializeCounts(counts: FacetCounts): SerializedCounts {
  return {
    deporte: [...counts.deporte],
    categoria: [...counts.categoria],
    marca: [...counts.marca],
    para: [...counts.para],
    personalizable: counts.personalizable,
  };
}

/** The group a listing route already fixes: a sport page needs no "Deporte" group, etc. */
export function fixedGroup(kind: ListingScope['kind']): FilterKey | null {
  if (kind === 'sport') return 'deporte';
  if (kind === 'brand') return 'marca';
  if (kind === 'category' || kind === 'subcategory') return 'categoria';
  return null;
}

/**
 * The panel's groups, in the design's order. A group appears when the listing has at least two
 * options in it and the route does not fix it already (`fixed`). Options go by count, then by name;
 * a selected option stays visible with 0 so it can be unchecked.
 */
export function buildFacetGroups(
  counts: SerializedCounts,
  scopeCounts: SerializedCounts,
  filters: ListingFilters,
  labels: FacetLabels,
  fixed: FilterKey | null = null,
): FacetGroup[] {
  const label = (key: FilterKey, value: string) =>
    key === 'para'
      ? (audienceLabels[value as keyof typeof audienceLabels] ?? value)
      : (labels[key][value] ?? value);
  return (['deporte', 'categoria', 'marca', 'para'] as const)
    .filter((key) => key !== fixed && scopeCounts[key].length >= 2)
    .map((key) => {
      const current = new Map(counts[key]);
      for (const value of filters[key]) if (!current.has(value)) current.set(value, 0);
      const options = [...current]
        .map(([value, count]) => ({ value, label: label(key, value), count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'));
      return { key, title: TITLES[key], options };
    });
}
