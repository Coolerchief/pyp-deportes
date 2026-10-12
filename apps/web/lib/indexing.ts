import type { MetadataRoute } from 'next';

/**
 * Search engines may index the site only when SITE_INDEXABLE is exactly "true". It stays unset
 * until the real domain points at the site (docs/06-IMPLEMENTATION-PLAN.md, fase 7), so the
 * workers.dev copy, previews and local builds always ship noindex (meta robots + robots.txt).
 */
export function isIndexable(env: Record<string, string | undefined> = process.env): boolean {
  return env.SITE_INDEXABLE === 'true';
}

/** Value for Metadata.robots in the root layout. */
export function robotsMeta(indexable: boolean) {
  return indexable ? { index: true, follow: true } : { index: false, follow: false };
}

/** Content of /robots.txt. The sitemap line arrives with sitemap.xml in T5.5. */
export function robotsTxt(indexable: boolean): MetadataRoute.Robots {
  return indexable
    ? { rules: { userAgent: '*', allow: '/', disallow: '/admin' } }
    : { rules: { userAgent: '*', disallow: '/' } };
}
