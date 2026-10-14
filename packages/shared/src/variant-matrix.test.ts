import { describe, expect, it } from 'vitest';
import { cleanQuantity, matrixLayout, piecesText, rowPieces, teamPreset } from './variant-matrix';

let n = 0;
const v = (o1: string | null, o2: string | null = null) => ({
  id: `00000000-0000-4000-8000-${String((n += 1)).padStart(12, '0')}`,
  sku: `S-${n}`,
  o1,
  o2,
});

describe('matrixLayout', () => {
  it('lists one row per size', () => {
    const layout = matrixLayout({
      option1Name: 'Talla',
      option2Name: null,
      variants: [v('CH'), v('M'), v('G')],
    });
    expect(layout.dimension).toBe('talla');
    expect(layout.colors).toBeNull();
    expect(layout.rows.map((r) => r.label)).toEqual(['CH', 'M', 'G']);
  });

  it('groups sizes by color when there are several colors', () => {
    const layout = matrixLayout({
      option1Name: 'Tamaño',
      option2Name: 'Color',
      variants: [v('3', 'Rojo'), v('4', 'Rojo'), v('3', 'Azul')],
    });
    expect(layout.dimension).toBe('tamaño');
    expect(layout.colors?.map((c) => [c.name, c.rows.map((r) => r.label)])).toEqual([
      ['Rojo', ['3', '4']],
      ['Azul', ['3']],
    ]);
  });

  it('shows a single shared color apart, and handles colors only or no options', () => {
    const fixed = matrixLayout({
      option1Name: 'Tamaño',
      option2Name: 'Color',
      variants: [v('4', 'Blanco/Azul'), v('5', 'Blanco/Azul')],
    });
    expect(fixed.fixedColor).toBe('Blanco/Azul');
    expect(fixed.rows.map((r) => r.label)).toEqual(['4', '5']);

    const colorsOnly = matrixLayout({
      option1Name: 'Talla',
      option2Name: 'Color',
      variants: [v(null, 'Negro'), v(null, 'Rojo')],
    });
    expect(colorsOnly.dimension).toBe('color');
    expect(colorsOnly.rows.map((r) => r.label)).toEqual(['Negro', 'Rojo']);

    const single = matrixLayout({ option1Name: 'Talla', option2Name: null, variants: [v(null)] });
    expect(single.dimension).toBe('pieza');
    expect(single.rows.map((r) => r.label)).toEqual(['Piezas']);
  });
});

describe('teamPreset', () => {
  const sizes = ['6', '8', '10', 'CH', 'M', 'G', 'XG', 'XXG'];
  const pieces = (total: number, list = sizes) => Object.fromEntries(teamPreset(list, total));

  it('matches the design: 12, 18 and 24 over CH, M, G and XG', () => {
    expect(pieces(12)).toMatchObject({ CH: 2, M: 4, G: 4, XG: 2, '6': 0, XXG: 0 });
    expect(pieces(18)).toMatchObject({ CH: 3, M: 6, G: 6, XG: 3 });
    expect(pieces(24)).toMatchObject({ CH: 4, M: 8, G: 8, XG: 4 });
  });

  it('spreads over every size of a product without adult sizes, middle first', () => {
    expect(pieces(12, ['6', '8', '10', '12', '14'])).toEqual({
      '6': 1,
      '8': 3,
      '10': 4,
      '12': 3,
      '14': 1,
    });
  });

  it('always keeps the exact total', () => {
    for (const list of [['CH'], ['CH', 'M'], ['S', 'M', 'L'], sizes]) {
      for (const total of [12, 18, 24]) {
        const sum = [...teamPreset(list, total).values()].reduce((a, b) => a + b, 0);
        expect(sum).toBe(total);
      }
    }
  });
});

describe('quantities and texts', () => {
  it('cleans typed quantities to 0–9 999', () => {
    expect(cleanQuantity('12')).toBe(12);
    expect(cleanQuantity('1a2')).toBe(12);
    expect(cleanQuantity('')).toBe(0);
    expect(cleanQuantity(-3)).toBe(0);
    expect(cleanQuantity('123456')).toBe(9999);
  });

  it('writes the row and total texts of the design', () => {
    expect(rowPieces(6)).toBe('6 pzs');
    expect(rowPieces(0)).toBe('—');
    expect(piecesText(1)).toBe('1 pieza');
    expect(piecesText(18)).toBe('18 piezas');
  });
});
