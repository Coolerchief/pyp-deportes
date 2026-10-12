import type { MetadataRoute } from 'next';
import { isIndexable, robotsTxt } from '@/lib/indexing';

// Static export: written to out/robots.txt at build time.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return robotsTxt(isIndexable());
}
