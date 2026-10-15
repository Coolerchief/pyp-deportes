import { describe, expect, it } from 'vitest';
import { mediaFileKey, mediaKeyBase, SignUploadRequestSchema } from './media.ts';

const ID = '0b6f0b6f-0000-4000-8000-000000000001';

describe('media keys', () => {
  it('builds the R2 keys of each kind of photo (TRD §6.2)', () => {
    expect(mediaKeyBase('product', ID, 'img')).toBe(`p/${ID}/img`);
    expect(mediaKeyBase('gallery', ID, 'img')).toBe(`g/${ID}/img`);
    expect(mediaKeyBase('site', 'home_hero', 'img')).toBe('s/home_hero/img');
    expect(mediaFileKey(`p/${ID}/img`, 640)).toBe(`p/${ID}/img-640.webp`);
  });
});

describe('SignUploadRequestSchema', () => {
  const valid = {
    scope: 'product',
    ownerId: ID,
    imageId: ID,
    widths: [320, 1600],
    contentType: 'image/webp',
  };
  const fields = (value: unknown) =>
    SignUploadRequestSchema.safeParse(value).error?.issues.map((i) => i.path.join('.')) ?? [];

  it('accepts products, gallery and site photos with their widths', () => {
    expect(fields(valid)).toEqual([]);
    expect(fields({ ...valid, scope: 'gallery' })).toEqual([]);
    expect(fields({ ...valid, scope: 'site', ownerId: 'advisor', widths: [640, 2400] })).toEqual(
      [],
    );
  });

  it('rejects owners, widths and types that do not belong', () => {
    expect(fields({ ...valid, ownerId: 'home_hero' })).toEqual(['ownerId']);
    expect(fields({ ...valid, scope: 'site', ownerId: 'portada', widths: [640] })).toEqual([
      'ownerId',
    ]);
    expect(fields({ ...valid, widths: [2400] })).toEqual(['widths']);
    expect(fields({ ...valid, widths: [320, 320] })).toEqual(['widths']);
    expect(fields({ ...valid, contentType: 'image/jpeg' })).toEqual(['contentType']);
  });
});
