import { type Database, toBatches } from '@pyp/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { centerOf, cropRect, decodePhoto, uploadProductPhoto } from './photos';

// Photos in bulk by SKU (T4.6, APP-FLOW §8.3): "BAL-001.jpg" is the first photo of BAL-001 and
// "BAL-001-2.jpg" the second. Each one gets the centered 4:5 crop and the same upload as the
// editor; files that match no SKU are listed so they can be renamed.

type Client = SupabaseClient<Database>;

export type NameCandidate = { sku: string; order: number };

/**
 * What a file name can mean, most specific first: the whole name as SKU, then a SKU followed by
 * "-n". "BAL-001" is ambiguous ("BAL" photo 1?) and is settled against the real SKUs.
 */
export function photoNameCandidates(fileName: string): NameCandidate[] {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  if (!base) return [];
  const candidates: NameCandidate[] = [{ sku: base.toUpperCase(), order: 1 }];
  const suffix = /^(.+?)[-_ ](\d{1,2})$/.exec(base);
  if (suffix) candidates.push({ sku: suffix[1]!.toUpperCase(), order: Number(suffix[2]) });
  return candidates;
}

export type KnownProduct = { id: string; sku: string; name: string };

export type PhotoMatch = { file: File; product: KnownProduct; order: number };

/** Files matched to products (in order per product) and the ones without a match. */
export function matchPhotos(
  files: readonly File[],
  products: ReadonlyMap<string, KnownProduct>,
): { matched: PhotoMatch[]; unmatched: File[] } {
  const matched: PhotoMatch[] = [];
  const unmatched: File[] = [];
  for (const file of files) {
    const hit = photoNameCandidates(file.name).find((c) => products.has(c.sku));
    if (hit) matched.push({ file, product: products.get(hit.sku)!, order: hit.order });
    else unmatched.push(file);
  }
  matched.sort(
    (a, b) =>
      a.product.sku.localeCompare(b.product.sku) ||
      a.order - b.order ||
      a.file.name.localeCompare(b.file.name),
  );
  return { matched, unmatched };
}

/** The products whose SKU (in capitals, as the panel saves them) some file name may carry. */
export async function findProducts(
  supabase: Client,
  files: readonly File[],
): Promise<Map<string, KnownProduct>> {
  const skus = [
    ...new Set(files.flatMap((file) => photoNameCandidates(file.name).map((c) => c.sku))),
  ];
  const found = new Map<string, KnownProduct>();
  for (const chunk of toBatches(skus, 100)) {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, name')
      .in('sku', chunk);
    if (error) throw error;
    for (const row of data ?? []) found.set(row.sku.toUpperCase(), row);
  }
  return found;
}

/** One photo: open it, crop the centered 4:5 and upload it like the editor does. */
export async function uploadMatchedPhoto(
  supabase: Client,
  match: PhotoMatch,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const photo = await decodePhoto(match.file);
  try {
    const center = { x: photo.size.width / 2, y: photo.size.height / 2 };
    const rect = cropRect(photo.size, 1, centerOf(cropRect(photo.size, 1, center)));
    await uploadProductPhoto({
      supabase,
      productId: match.product.id,
      bitmap: photo.bitmap,
      rect,
      alt: '',
      onProgress: (step, fraction) =>
        onProgress?.(step === 'preparing' ? 0.05 : step === 'saving' ? 1 : 0.1 + fraction * 0.85),
    });
  } finally {
    photo.bitmap.close?.();
    URL.revokeObjectURL(photo.previewUrl);
  }
}
