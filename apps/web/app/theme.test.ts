import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Guards the Tailwind theme against drift from the design export (design/tokens/tokens.json).

type TextStyle = {
  name: string;
  fontSize: string;
  lineHeight: number;
  fontWeight: number;
  fontStyle?: string;
  letterSpacing?: string;
  usage: string;
};

type Tokens = {
  color: { tokens: { name: string; value: string }[] };
  type: { groups: { styles: TextStyle[] }[] };
  radius: { tokens: { name: string; value: string }[] };
};

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const css = read('./globals.css');
const tokens = JSON.parse(read('../../../design/tokens/tokens.json')) as Tokens;

function utilityBlock(name: string): string {
  const start = css.indexOf(`@utility ${name} {`);
  expect(start, `@utility ${name} is missing`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf('\n}', start);
  return css.slice(start, end);
}

function declaration(block: string, property: string): string | undefined {
  // Base declarations are indented two spaces; the lg override sits deeper.
  return block.match(new RegExp(`\n  ${property}: ([^;]+);`))?.[1];
}

describe('theme colors', () => {
  it.each(tokens.color.tokens)('defines --color-$name as $value', ({ name, value }) => {
    expect(css).toContain(`--color-${name}: ${value.toLowerCase()};`);
  });

  it('defines no colors outside the brand palette', () => {
    const defined = [...css.matchAll(/--color-([a-z-]+): #/g)].map((match) => match[1]);
    expect(defined.sort()).toEqual(tokens.color.tokens.map((token) => token.name).sort());
  });
});

describe('type scale', () => {
  const styles = tokens.type.groups.flatMap((group) => group.styles);

  it('has the 13 text styles', () => {
    expect(styles).toHaveLength(13);
  });

  it.each(styles)('type-$name matches tokens.json', (style) => {
    const block = utilityBlock(`type-${style.name}`);
    const mobile = style.usage.match(/(\d+)px en móvil/)?.[1];
    const lg = block.match(/@variant lg \{\s*font-size: ([^;]+);/)?.[1];

    if (mobile) {
      expect(declaration(block, 'font-size')).toBe(`${mobile}px`);
      expect(lg).toBe(style.fontSize);
    } else {
      expect(declaration(block, 'font-size')).toBe(style.fontSize);
      expect(lg).toBeUndefined();
    }
    expect(Number(declaration(block, 'line-height'))).toBe(style.lineHeight);
    expect(Number(declaration(block, 'font-weight'))).toBe(style.fontWeight);
    expect(declaration(block, 'font-style')).toBe(style.fontStyle);
    expect(declaration(block, 'letter-spacing')).toBe(style.letterSpacing);
  });
});

describe('radius', () => {
  it('uses the 2px small radius', () => {
    const sm = tokens.radius.tokens.find((token) => token.name === 'radius-sm');
    expect(css).toContain(`--radius-sm: ${sm?.value};`);
  });
});
