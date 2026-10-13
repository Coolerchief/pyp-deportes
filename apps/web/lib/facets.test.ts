import { EMPTY_FILTERS } from '@pyp/shared';
import { describe, expect, it } from 'vitest';
import { buildFacetGroups, fixedGroup, type SerializedCounts } from './facets';

const counts: SerializedCounts = {
  deporte: [
    ['futbol', 10],
    ['basquetbol', 3],
  ],
  categoria: [['balones', 13]],
  marca: [
    ['pyp', 4],
    ['molten', 9],
    ['adidas', 4],
  ],
  para: [
    ['unisex', 11],
    ['infantil', 2],
  ],
  personalizable: 5,
};
const labels = {
  deporte: { futbol: 'Fútbol', basquetbol: 'Básquetbol' },
  categoria: { balones: 'Balones' },
  marca: { pyp: 'P&P', molten: 'Molten', adidas: 'Adidas' },
};

describe('buildFacetGroups', () => {
  it('shows groups with two options or more, sorted by count and name', () => {
    const groups = buildFacetGroups(counts, counts, EMPTY_FILTERS, labels);
    expect(groups.map((g) => g.title)).toEqual(['Deporte', 'Marca', 'Para']);
    expect(groups[1]?.options.map((o) => o.label)).toEqual(['Molten', 'Adidas', 'P&P']);
    expect(groups[2]?.options[1]).toEqual({ value: 'infantil', label: 'Infantil', count: 2 });
  });

  it('leaves out the group the route already fixes', () => {
    expect(fixedGroup('sport')).toBe('deporte');
    expect(fixedGroup('all')).toBeNull();
    const groups = buildFacetGroups(counts, counts, EMPTY_FILTERS, labels, fixedGroup('sport'));
    expect(groups.map((g) => g.key)).toEqual(['marca', 'para']);
  });

  it('keeps a selected option with 0 so it can be unchecked', () => {
    const narrowed = { ...counts, marca: [['molten', 2]] as [string, number][] };
    const groups = buildFacetGroups(
      narrowed,
      counts,
      { ...EMPTY_FILTERS, marca: ['adidas'] },
      labels,
    );
    expect(groups.find((g) => g.key === 'marca')?.options).toEqual([
      { value: 'molten', label: 'Molten', count: 2 },
      { value: 'adidas', label: 'Adidas', count: 0 },
    ]);
  });
});
