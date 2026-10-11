// @vitest-environment node
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import placeholders from './placeholders.json';

const dir = fileURLToPath(new URL('../public/img/placeholder/', import.meta.url));

describe('generic category images (T0.5)', () => {
  it('has exactly one file per category', () => {
    const files = readdirSync(dir).sort();
    const expected = placeholders.categories.map(({ slug }) => `${slug}.webp`).sort();
    expect(placeholders.categories).toHaveLength(10);
    expect(files).toEqual(expected);
  });

  it.each(placeholders.categories)('$slug.webp is a 4:5 WebP', async ({ slug }) => {
    const { format, width, height } = await sharp(`${dir}${slug}.webp`).metadata();
    expect(format).toBe('webp');
    expect(width).toBe(placeholders.cssWidth * placeholders.scale);
    expect(height).toBe((width! * 5) / 4);
  });
});
