import { describe, expect, it } from 'vitest';
import mediaLoader, { MEDIA_URL, mediaUrl, nearestWidth } from './loader';

describe('mediaLoader', () => {
  it('maps a product image to the nearest generated width', () => {
    const src = mediaUrl('p/prod-1/img-1');
    expect(src).toBe(`${MEDIA_URL}/p/prod-1/img-1`);
    expect(mediaLoader({ src, width: 300 })).toBe(`${src}-320.webp`);
    expect(mediaLoader({ src, width: 640 })).toBe(`${src}-640.webp`);
    expect(mediaLoader({ src, width: 750 })).toBe(`${src}-1024.webp`);
    expect(mediaLoader({ src, width: 3840 })).toBe(`${src}-1600.webp`);
  });

  it('uses the site photo widths for site_media', () => {
    const src = mediaUrl('s/home_hero/img-2');
    expect(mediaLoader({ src, width: 384 })).toBe(`${src}-640.webp`);
    expect(mediaLoader({ src, width: 2048 })).toBe(`${src}-2400.webp`);
  });

  it('leaves files of the site untouched', () => {
    expect(mediaLoader({ src: '/img/placeholder/balones.webp', width: 640 })).toBe(
      '/img/placeholder/balones.webp',
    );
  });

  it('defaults to production media and picks widths', () => {
    expect(MEDIA_URL).toMatch(/^https:\/\//);
    expect(nearestWidth([320, 640], 10)).toBe(320);
  });
});
