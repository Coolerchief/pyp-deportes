import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('next.config', () => {
  it('builds a static export without trailing slashes', () => {
    expect(nextConfig.output).toBe('export');
    expect(nextConfig.trailingSlash).toBe(false);
  });

  it('maps images to the widths generated in R2', () => {
    expect(nextConfig.images).toEqual({
      loader: 'custom',
      loaderFile: './lib/images/loader.ts',
      deviceSizes: [320, 640, 1024, 1600, 2400],
      imageSizes: [],
    });
  });
});
