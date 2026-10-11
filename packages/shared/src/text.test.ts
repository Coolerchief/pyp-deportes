import { describe, expect, it } from 'vitest';
import { digitsOnly, normalizeText, slugify, variantLabel, variantSku } from './text';

describe('normalizeText', () => {
  it('lowercases and removes accents, tildes and diaeresis like unaccent', () => {
    expect(normalizeText('Balón Fútbol ÑANDÚ Pingüino')).toBe('balon futbol nandu pinguino');
  });

  it('lets a misspelled search match: "valon" and "balón" differ only by the typo', () => {
    expect(normalizeText('Balón')).toBe('balon');
  });
});

describe('slugify', () => {
  it('builds URL slugs', () => {
    expect(slugify('Ropa Deportiva')).toBe('ropa-deportiva');
    expect(slugify('P&P')).toBe('p-p');
    expect(slugify('  Guantes de portero!! ')).toBe('guantes-de-portero');
  });
});

describe('variantSku', () => {
  it('follows {sku}-{OPTION1}-{OPTION2} in uppercase without accents or symbols', () => {
    expect(variantSku('BAL-005', '#5', 'Blanco/Rojo')).toBe('BAL-005-5-BLANCO-ROJO');
    expect(variantSku('UNI-001', 'CH')).toBe('UNI-001-CH');
    expect(variantSku('NAT-001', null, 'Azul marino')).toBe('NAT-001-AZUL-MARINO');
  });

  it('uses the product SKU for the default variant', () => {
    expect(variantSku('AUX-001')).toBe('AUX-001');
  });
});

describe('variantLabel', () => {
  it('joins the options with a middle dot', () => {
    expect(variantLabel('#5', 'Blanco/Rojo')).toBe('#5 · Blanco/Rojo');
    expect(variantLabel('M')).toBe('M');
    expect(variantLabel(null, null)).toBeNull();
  });
});

describe('digitsOnly', () => {
  it('drops spaces and dashes', () => {
    expect(digitsOnly('55 1234-5678')).toBe('5512345678');
  });
});
