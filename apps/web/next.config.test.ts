import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('next.config', () => {
  it('builds a static export without trailing slashes', () => {
    expect(nextConfig.output).toBe('export');
    expect(nextConfig.trailingSlash).toBe(false);
  });
});
