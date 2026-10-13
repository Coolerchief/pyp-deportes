// next/image loader for the static export (TRD §6.2): Next's optimizer does not exist there, so
// each requested width maps to the nearest WebP the admin generated in R2. Paths that start
// with "/" (logos, generic category images) are files of the site and pass through unchanged.

/** Public base of the R2 bucket; the default is production's media domain. */
export const MEDIA_URL = (
  process.env.NEXT_PUBLIC_MEDIA_URL?.trim() || 'https://media.pypdeportescoapa.com'
).replace(/\/+$/, '');

/** Widths generated on upload: products and gallery (p/, g/) and site photos (s/). */
export const PRODUCT_WIDTHS = [320, 640, 1024, 1600] as const;
export const SITE_WIDTHS = [640, 1024, 1600, 2400] as const;

/** Full URL of an image in R2 from its key_base ('p/{productId}/{imageId}'), without width. */
export function mediaUrl(keyBase: string): string {
  return `${MEDIA_URL}/${keyBase.replace(/^\/+/, '')}`;
}

/** The smallest generated width that covers the request, or the largest one. */
export function nearestWidth(widths: readonly number[], requested: number): number {
  return widths.find((w) => w >= requested) ?? (widths[widths.length - 1] as number);
}

export default function mediaLoader({ src, width }: { src: string; width: number }): string {
  if (!src.startsWith(`${MEDIA_URL}/`)) return src;
  const key = src.slice(MEDIA_URL.length + 1);
  const widths = key.startsWith('s/') ? SITE_WIDTHS : PRODUCT_WIDTHS;
  return `${src}-${nearestWidth(widths, width)}.webp`;
}
