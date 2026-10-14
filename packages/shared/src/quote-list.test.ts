import { describe, expect, it } from 'vitest';
import {
  addToQuote,
  EMPTY_QUOTE,
  groupQuoteLines,
  piecesOf,
  type QuoteAddition,
  QUOTE_STORAGE_VERSION,
  quoteTotals,
  removeLines,
  restoreLines,
  restoreQuote,
  setPersonalization,
  setQuantity,
  unavailableLineIds,
} from './quote-list';

const NOW = '2026-10-13T12:00:00.000Z';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let next = 0;
const newId = () => `line-${(next += 1)}`;

const uniform = (variants: [number, string | null, number][], extra: Partial<QuoteAddition> = {}) =>
  ({
    productId: uuid(1),
    personalize: false,
    notes: '',
    product: { name: 'Uniforme', sku: 'UNI-001', slug: 'uniforme', image: null },
    variants: variants.map(([n, label, quantity]) => ({
      variantId: uuid(100 + n),
      label,
      quantity,
    })),
    ...extra,
  }) satisfies QuoteAddition;

describe('addToQuote', () => {
  it('creates one line per variant with more than 0 pieces', () => {
    const { state, added, skipped } = addToQuote(
      EMPTY_QUOTE,
      uniform([
        [1, 'CH', 3],
        [2, 'M', 0],
        [3, 'G', 6],
      ]),
      NOW,
      newId,
    );
    expect(state.lines.map((l) => [l.snapshot.variantLabel, l.quantity])).toEqual([
      ['CH', 3],
      ['G', 6],
    ]);
    expect(state.lines[0]).toMatchObject({
      productId: uuid(1),
      variantId: uuid(101),
      addedAt: NOW,
    });
    expect(added).toHaveLength(2);
    expect(skipped).toBe(0);
    expect(state.updatedAt).toBe(NOW);
  });

  it('adds up a variant already in the list, capped at 9 999', () => {
    let { state } = addToQuote(EMPTY_QUOTE, uniform([[1, 'CH', 3]]), NOW, newId);
    ({ state } = addToQuote(state, uniform([[1, 'CH', 4]]), NOW, newId));
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]?.quantity).toBe(7);
    ({ state } = addToQuote(state, uniform([[1, 'CH', 9999]]), NOW, newId));
    expect(state.lines[0]?.quantity).toBe(9999);
  });

  it('replaces the personalization note only with a new non-empty one', () => {
    let { state } = addToQuote(
      EMPTY_QUOTE,
      uniform([[1, 'CH', 1]], { personalize: true, notes: '  Escudo azul  ' }),
      NOW,
      newId,
    );
    expect(state.lines[0]).toMatchObject({ personalize: true, notes: 'Escudo azul' });
    ({ state } = addToQuote(state, uniform([[1, 'CH', 1]], { notes: '' }), NOW, newId));
    expect(state.lines[0]?.notes).toBe('Escudo azul');
    ({ state } = addToQuote(state, uniform([[1, 'CH', 1]], { notes: 'Escudo rojo' }), NOW, newId));
    expect(state.lines[0]?.notes).toBe('Escudo rojo');
  });

  it('stops at 100 lines and reports what was left out', () => {
    const many = uniform(
      Array.from({ length: 99 }, (_, i) => [i, `T${i}`, 1] as [number, string, number]),
    );
    let { state } = addToQuote(EMPTY_QUOTE, many, NOW, newId);
    expect(state.lines).toHaveLength(99);
    const result = addToQuote(
      state,
      uniform([
        [200, 'X', 1],
        [201, 'Y', 1],
        [0, 'T0', 2],
      ]),
      NOW,
      newId,
    );
    state = result.state;
    expect(state.lines).toHaveLength(100);
    expect(result.skipped).toBe(1);
    // A variant already in the list still adds up past the limit.
    expect(state.lines[0]?.quantity).toBe(3);
  });

  it('changes nothing with 0 pieces', () => {
    const result = addToQuote(EMPTY_QUOTE, uniform([[1, 'CH', 0]]), NOW, newId);
    expect(result.state).toBe(EMPTY_QUOTE);
    expect(result.added).toEqual([]);
  });
});

describe('editing the list', () => {
  const base = addToQuote(
    EMPTY_QUOTE,
    uniform([
      [1, 'CH', 3],
      [2, 'M', 6],
    ]),
    NOW,
    newId,
  ).state;

  it('sets quantities between 1 and 9 999', () => {
    const id = base.lines[0]!.lineId;
    expect(setQuantity(base, id, 12, NOW).lines[0]?.quantity).toBe(12);
    expect(setQuantity(base, id, 0, NOW).lines[0]?.quantity).toBe(1);
    expect(setQuantity(base, id, 20000, NOW).lines[0]?.quantity).toBe(9999);
    expect(setQuantity(base, id, 4.7, NOW).lines[0]?.quantity).toBe(4);
  });

  it('removes lines and puts them back in place with "Deshacer"', () => {
    const first = base.lines[0]!.lineId;
    const { state, removed } = removeLines(base, [first], NOW);
    expect(state.lines.map((l) => l.snapshot.variantLabel)).toEqual(['M']);
    expect(restoreLines(state, removed, NOW).lines.map((l) => l.snapshot.variantLabel)).toEqual([
      'CH',
      'M',
    ]);
  });

  it('edits the personalization of every line of a product', () => {
    const edited = setPersonalization(base, uuid(1), true, 'Nombres y números', NOW);
    expect(edited.lines.every((l) => l.personalize && l.notes === 'Nombres y números')).toBe(true);
    const cleared = setPersonalization(edited, uuid(1), false, 'ignorado', NOW);
    expect(cleared.lines.every((l) => !l.personalize && l.notes === '')).toBe(true);
  });

  it('counts pieces and products, and the pieces of one product', () => {
    expect(quoteTotals(base.lines)).toEqual({ pieces: 9, products: 1 });
    expect(piecesOf(base.lines, uuid(1))).toBe(9);
    expect(piecesOf(base.lines, uuid(2))).toBe(0);
  });

  it('marks lines of products that are no longer published', () => {
    expect(unavailableLineIds(base.lines, new Set([uuid(1)])).size).toBe(0);
    expect(unavailableLineIds(base.lines, new Set()).size).toBe(2);
  });
});

describe('restoreQuote', () => {
  const saved = addToQuote(EMPTY_QUOTE, uniform([[1, 'CH', 3]]), NOW, newId).state;

  it('restores a saved list of this version', () => {
    expect(restoreQuote(saved, QUOTE_STORAGE_VERSION, '2026-10-20T00:00:00.000Z')).toEqual(saved);
  });

  it('starts empty after 30 days without changes', () => {
    expect(restoreQuote(saved, QUOTE_STORAGE_VERSION, '2026-11-13T12:00:01.000Z').lines).toEqual(
      [],
    );
  });

  it('starts empty with another version or broken data, and drops invalid lines', () => {
    expect(restoreQuote(saved, 99, NOW)).toEqual(EMPTY_QUOTE);
    expect(restoreQuote('basura', QUOTE_STORAGE_VERSION, NOW)).toEqual(EMPTY_QUOTE);
    const mixed = { ...saved, lines: [...saved.lines, { lineId: 'x', quantity: -1 }] };
    expect(restoreQuote(mixed, QUOTE_STORAGE_VERSION, NOW).lines).toHaveLength(1);
  });
});

describe('groupQuoteLines', () => {
  it('groups lines by product in the order they were added', () => {
    let { state } = addToQuote(
      EMPTY_QUOTE,
      uniform(
        [
          [1, 'CH', 3],
          [2, 'M', 6],
        ],
        { personalize: true, notes: 'Escudo' },
      ),
      NOW,
      newId,
    );
    ({ state } = addToQuote(
      state,
      {
        ...uniform([[9, '#5', 12]]),
        productId: uuid(2),
        product: { name: 'Balón', sku: 'BAL', slug: 'balon', image: null },
      },
      NOW,
      newId,
    ));
    const groups = groupQuoteLines(state.lines);
    expect(
      groups.map((g) => [g.snapshot.name, g.pieces, g.lines.length, g.personalize, g.notes]),
    ).toEqual([
      ['Uniforme', 9, 2, true, 'Escudo'],
      ['Balón', 12, 1, false, ''],
    ]);
  });
});
