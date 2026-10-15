import { describe, expect, it } from 'vitest';
import {
  parseOptionValues,
  planVariants,
  replaceSummary,
  type VariantsForm,
  VariantsFormSchema,
  variantsPayload,
} from './admin-variants.ts';

const form: VariantsForm = {
  option1Name: 'Talla',
  option1Values: 'CH, M',
  hasColors: true,
  option2Name: 'Color',
  option2Values: 'Rojo | Azul',
  colorNote: 'A elegir',
};

const messages = (values: VariantsForm) =>
  VariantsFormSchema.safeParse(values).error?.issues.map((i) => [i.path.join('.'), i.message]) ??
  [];

describe('parseOptionValues', () => {
  it('splits by comma or bar, trims and drops repeats', () => {
    expect(parseOptionValues(' CH, M |G,, M ')).toEqual(['CH', 'M', 'G']);
    expect(parseOptionValues('  ')).toEqual([]);
  });
});

describe('planVariants', () => {
  const existing = [
    { id: 'v0', option1: null, option2: null, isActive: false },
    { id: 'v1', option1: 'CH', option2: null, isActive: true },
    { id: 'v2', option1: 'M', option2: null, isActive: false },
    { id: 'v3', option1: 'G', option2: null, isActive: true },
  ];

  it('says which variants are new, kept, reactivated or deactivated', () => {
    const plan = planVariants({
      productSku: 'uni-001',
      option1: ['CH', 'M', 'XG'],
      option2: [],
      existing,
    });
    expect(plan.rows).toEqual([
      { option1: 'CH', option2: null, label: 'CH', sku: 'UNI-001-CH', state: 'kept' },
      { option1: 'M', option2: null, label: 'M', sku: 'UNI-001-M', state: 'reactivated' },
      { option1: 'XG', option2: null, label: 'XG', sku: 'UNI-001-XG', state: 'new' },
    ]);
    expect(plan.deactivated.map((v) => v.label)).toEqual(['G']);
    expect(plan.unchanged).toBe(false);
  });

  it('orders sizes × colors like the database and builds their SKUs', () => {
    const plan = planVariants({
      productSku: 'BAL-005',
      option1: ['#5'],
      option2: ['Blanco/Rojo', 'Ámbar'],
      existing: [],
    });
    expect(plan.rows.map((r) => [r.label, r.sku])).toEqual([
      ['#5 · Blanco/Rojo', 'BAL-005-5-BLANCO-ROJO'],
      ['#5 · Ámbar', 'BAL-005-5-AMBAR'],
    ]);
  });

  it('with no values plans the single default variant', () => {
    const plan = planVariants({ productSku: 'X-1', option1: [], option2: [], existing });
    expect(plan.rows).toEqual([
      { option1: null, option2: null, label: 'Única', sku: 'X-1', state: 'reactivated' },
    ]);
    expect(plan.deactivated.map((v) => v.id)).toEqual(['v1', 'v3']);
  });

  it('notices when nothing would change', () => {
    expect(
      planVariants({ productSku: 'X', option1: ['CH', 'G'], option2: [], existing }).unchanged,
    ).toBe(true);
  });
});

describe('VariantsFormSchema', () => {
  it('accepts sizes × colors', () => {
    expect(messages(form)).toEqual([]);
  });

  it('asks for the names and values it needs', () => {
    expect(messages({ ...form, option1Name: ' ', option2Name: '', option2Values: '' })).toEqual([
      ['option1Name', 'Escribe el nombre de la opción, por ejemplo Talla.'],
      ['option2Name', 'Escribe el nombre de la opción, por ejemplo Color.'],
      ['option2Values', 'Escribe al menos un color o quita "Tiene colores".'],
    ]);
    expect(messages({ ...form, hasColors: false, option2Values: '' })).toEqual([]);
  });

  it('catches values that would break the SKU', () => {
    expect(messages({ ...form, option1Values: 'M, m' })).toEqual([
      ['option1Values', '"M" y "m" darían el mismo SKU.'],
    ]);
    expect(messages({ ...form, option2Values: '???' })).toEqual([
      ['option2Values', '"???" necesita letras o números.'],
    ]);
    expect(messages({ ...form, option1Values: 'x'.repeat(41) })[0]?.[1]).toMatch(/40 caracteres/);
  });

  it('allows at most 200 combinations', () => {
    const sizes = Array.from({ length: 21 }, (_, i) => `T${i}`).join(',');
    const colors = Array.from({ length: 10 }, (_, i) => `C${i}`).join(',');
    expect(messages({ ...form, option1Values: sizes, option2Values: colors })).toEqual([
      ['option1Values', 'Son demasiadas combinaciones: el máximo es 200 variantes.'],
    ]);
  });
});

describe('payload and summary', () => {
  it('builds the arguments of admin_save_variants', () => {
    expect(variantsPayload('p1', form)).toEqual({
      product_id: 'p1',
      option1_name: 'Talla',
      option2_name: 'Color',
      color_note: '',
      option1: ['CH', 'M'],
      option2: ['Rojo', 'Azul'],
    });
    expect(variantsPayload('p1', { ...form, hasColors: false })).toMatchObject({
      option2_name: '',
      color_note: 'A elegir',
      option2: [],
    });
  });

  it('sums up the result', () => {
    expect(replaceSummary({ created: 2, kept: 3, deactivated: 1 })).toBe(
      '2 nuevas, 3 se conservan y 1 desactivada.',
    );
    expect(replaceSummary({ created: 1, kept: 0, deactivated: 0 })).toBe('1 nueva.');
    expect(replaceSummary({ created: 0, kept: 0, deactivated: 0 })).toBe('Sin cambios.');
  });
});
