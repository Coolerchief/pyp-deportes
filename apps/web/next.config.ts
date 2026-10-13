import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// One env file at the repo root (.env.local, pointing at pyp-dev) serves the db scripts and the
// site. Real environment variables (CI, deploy) win because loadEnvFile never overrides them.
const rootEnvFile = resolve(process.cwd(), '../../.env.local');
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Public site is fully static (TRD ADR-1); the build writes apps/web/out.
  output: 'export',
  trailingSlash: false,
  // `page.dev.tsx` routes (/dev/*) exist only under `next dev` and never reach the build.
  pageExtensions: isDev ? ['dev.tsx', 'tsx', 'ts'] : ['tsx', 'ts'],
  // No optimizer in a static export: lib/images/loader.ts maps widths to the WebP sizes in R2.
  // srcset offers exactly the widths that exist (products 320–1600, site photos up to 2400).
  images: {
    loader: 'custom',
    loaderFile: './lib/images/loader.ts',
    deviceSizes: [320, 640, 1024, 1600, 2400],
    imageSizes: [],
  },
  transpilePackages: ['@pyp/shared'],
};

export default nextConfig;
