// Photos in R2 (TRD §6.2, Schema §9.2): where each kind of photo lives and which widths are
// generated. Shared by sign-upload (Deno) and the panel, so both build the same keys.

import { z } from 'zod';
import { SITE_MEDIA_SLOTS } from './build-data.ts';

/** Widths generated for products and the gallery (4:5) and for site photos. */
export const MEDIA_WIDTHS = {
  product: [320, 640, 1024, 1600],
  gallery: [320, 640, 1024, 1600],
  site: [640, 1024, 1600, 2400],
} as const;

export type MediaScope = keyof typeof MEDIA_WIDTHS;

const PREFIX: Record<MediaScope, string> = { product: 'p', gallery: 'g', site: 's' };

/** Uploads are immutable: the name carries the imageId and is never overwritten. */
export const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const MEDIA_CONTENT_TYPE = 'image/webp';
/** Life of a signed upload URL, in seconds (Schema §9.2). */
export const SIGNED_UPLOAD_SECONDS = 600;

/** 'p/{productId}/{imageId}': products.images.key_base, without width or extension. */
export function mediaKeyBase(scope: MediaScope, ownerId: string, imageId: string): string {
  return `${PREFIX[scope]}/${ownerId}/${imageId}`;
}

/** The file of one width: 'p/{productId}/{imageId}-320.webp'. */
export function mediaFileKey(keyBase: string, width: number): string {
  return `${keyBase}-${width}.webp`;
}

const uuid = z.uuid('Debe ser un uuid.');

/** Body of POST sign-upload (Schema §9.2). */
export const SignUploadRequestSchema = z
  .object({
    scope: z.enum(['product', 'gallery', 'site']),
    ownerId: z.string(),
    imageId: uuid,
    widths: z.array(z.number().int()).min(1).max(4),
    contentType: z.literal(MEDIA_CONTENT_TYPE),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'site') {
      if (!(SITE_MEDIA_SLOTS as readonly string[]).includes(value.ownerId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['ownerId'],
          message: 'Espacio de foto desconocido.',
        });
      }
    } else if (!uuid.safeParse(value.ownerId).success) {
      ctx.addIssue({ code: 'custom', path: ['ownerId'], message: 'Debe ser un uuid.' });
    }
    const allowed = MEDIA_WIDTHS[value.scope] as readonly number[];
    if (value.widths.some((width) => !allowed.includes(width))) {
      ctx.addIssue({
        code: 'custom',
        path: ['widths'],
        message: `Anchos permitidos: ${allowed.join(', ')}.`,
      });
    }
    if (new Set(value.widths).size !== value.widths.length) {
      ctx.addIssue({ code: 'custom', path: ['widths'], message: 'Hay anchos repetidos.' });
    }
  });
export type SignUploadRequest = z.infer<typeof SignUploadRequestSchema>;

export type SignedUpload = { width: number; key: string; url: string };
export type SignUploadResponse = {
  keyBase: string;
  uploads: SignedUpload[];
  /** Send exactly these headers with every PUT (they are part of the signature). */
  headers: { 'Content-Type': string; 'Cache-Control': string };
  expiresIn: number;
};
