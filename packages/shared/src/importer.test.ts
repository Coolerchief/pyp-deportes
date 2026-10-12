import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IMPORT_COLUMNS, ImportRowSchema, splitList, type ImportRowInput } from './importer';

const base: ImportRowInput = {
  sku: 'BAL-002',
  slug: 'balon-soccer-cruzeiro',
  nombre: 'Balón Soccer Cruzeiro',
  marca: 'Cruzeiro',
  categoria: 'balones',
  subcategoria: 'balones-futbol',
  deportes: 'futbol',
  publico: 'unisex',
  descripcion_corta: 'Balón cosido.',
  personalizable: 'no',
  tecnicas: '',
  tallas: '3|4|5',
  colores: 'Blanco/Azul',
  destacado: 'no',
  estado: 'publicado',
  origen: 'sitio_actual',
  url_anterior: 'https://www.pypdeportescoapa.com/producto/balon-soccer-cruzeiro/',
};

function errors(input: ImportRowInput) {
  const result = ImportRowSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('ImportRowSchema', () => {
  it('maps a CSV row to a typed product', () => {
    expect(ImportRowSchema.parse(base)).toMatchObject({
      sku: 'BAL-002',
      name: 'Balón Soccer Cruzeiro',
      subcategory: 'balones-futbol',
      sports: ['futbol'],
      status: 'published',
      sizes: ['3', '4', '5'],
      colors: ['Blanco/Azul'],
      colorNote: null,
      variantCount: 3,
    });
  });

  it('treats unitalla and "A elegir" like the importer', () => {
    const row = ImportRowSchema.parse({
      ...base,
      tallas: 'unitalla',
      colores: 'A elegir',
      url_anterior: '',
    });
    expect(row).toMatchObject({ sizes: [], colors: [], colorNote: 'A elegir', variantCount: 1 });
  });

  it('applies defaults and accepts sí', () => {
    const row = ImportRowSchema.parse({
      ...base,
      publico: '',
      estado: '',
      personalizable: 'Sí',
      tecnicas: 'Sublimacion | bordado',
      subcategoria: '',
    });
    expect(row).toMatchObject({
      audience: 'unisex',
      status: 'draft',
      isCustomizable: true,
      techniques: ['sublimacion', 'bordado'],
      subcategory: null,
    });
  });

  it('reports the same problems as admin_import_products', () => {
    expect(errors({ ...base, sku: ' ' })).toEqual(['Falta el SKU.']);
    expect(errors({ ...base, slug: 'Balón Soccer', url_anterior: '' })).toEqual([
      'El slug solo puede tener minúsculas, números y guiones.',
    ]);
    expect(errors({ ...base, publico: 'niños' })).toEqual([
      'publico debe ser adulto, infantil o unisex.',
    ]);
    expect(errors({ ...base, estado: 'activo' })).toEqual([
      'estado debe ser borrador, publicado o archivado.',
    ]);
    expect(errors({ ...base, tecnicas: 'estampado' })).toEqual([
      'tecnicas solo acepta sublimacion, vinil, bordado y serigrafia.',
    ]);
    expect(errors({ ...base, destacado: 'tal vez' })).toEqual(['destacado debe ser si o no.']);
    expect(errors({ ...base, slug: 'otro-slug' })).toEqual([
      'El slug no coincide con el de url_anterior ("balon-soccer-cruzeiro").',
    ]);
  });

  it('splits lists', () => {
    expect(splitList(' a | b||c ')).toEqual(['a', 'b', 'c']);
  });
});

describe('initial catalog CSV', () => {
  // docs/data/catalogo-inicial.csv has no quoted fields, so a plain split reads it.
  const csv = readFileSync(
    new URL('../../../docs/data/catalogo-inicial.csv', import.meta.url),
    'utf8',
  );
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const rows = lines.map((line) =>
    Object.fromEntries(header!.split(',').map((key, i) => [key, line.split(',')[i] ?? ''])),
  );

  it('uses the template columns', () => {
    expect(csv).not.toContain('"');
    expect(header!.split(',')).toEqual([...IMPORT_COLUMNS]);
  });

  it('validates all 56 rows and yields the 313 variants loaded in pyp-dev', () => {
    const parsed = rows.map((row) => ImportRowSchema.parse(row));
    expect(parsed).toHaveLength(56);
    expect(parsed.reduce((total, row) => total + row.variantCount, 0)).toBe(313);
  });
});
