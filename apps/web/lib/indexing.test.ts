import { describe, expect, it } from 'vitest';
import { isIndexable, robotsMeta, robotsTxt } from './indexing';

describe('indexing', () => {
  it('is off unless SITE_INDEXABLE is exactly "true"', () => {
    expect(isIndexable({})).toBe(false);
    expect(isIndexable({ SITE_INDEXABLE: '1' })).toBe(false);
    expect(isIndexable({ SITE_INDEXABLE: 'TRUE' })).toBe(false);
    expect(isIndexable({ SITE_ENV: 'production' })).toBe(false);
    expect(isIndexable({ SITE_INDEXABLE: 'true' })).toBe(true);
  });

  it('blocks every crawler while it is off', () => {
    expect(robotsMeta(false)).toEqual({ index: false, follow: false });
    expect(robotsTxt(false)).toEqual({ rules: { userAgent: '*', disallow: '/' } });
  });

  it('allows the site but not the admin once it is on', () => {
    expect(robotsMeta(true)).toEqual({ index: true, follow: true });
    expect(robotsTxt(true)).toEqual({ rules: { userAgent: '*', allow: '/', disallow: '/admin' } });
  });
});
