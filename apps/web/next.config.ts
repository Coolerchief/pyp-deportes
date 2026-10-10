import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Public site is fully static (TRD ADR-1); the build writes apps/web/out.
  output: 'export',
  trailingSlash: false,
  // `page.dev.tsx` routes (/dev/*) exist only under `next dev` and never reach the build.
  pageExtensions: isDev ? ['dev.tsx', 'tsx', 'ts'] : ['tsx', 'ts'],
  // next/image needs a custom loader for static export; the R2 loader arrives in T2.3.
  images: { unoptimized: true },
  transpilePackages: ['@pyp/shared'],
};

export default nextConfig;
