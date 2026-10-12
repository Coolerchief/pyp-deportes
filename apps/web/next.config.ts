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
  // next/image needs a custom loader for static export; the R2 loader arrives in T2.3.
  images: { unoptimized: true },
  transpilePackages: ['@pyp/shared'],
};

export default nextConfig;
