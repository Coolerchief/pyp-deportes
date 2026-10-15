import { describe, expect, it } from 'vitest';
import { Constants } from '../database.types.ts';
import {
  PRODUCT_STATUSES,
  PUBLISH_STATUSES,
  QUOTE_STATUSES,
  productStatusLabels,
  publishStatusLabels,
  quoteStatusLabels,
} from './labels.ts';

// The Spanish labels follow the database enums: a new value there needs its label here.
describe('labels', () => {
  it('cover every value of the database enums, in the same order', () => {
    expect([...QUOTE_STATUSES]).toEqual([...Constants.public.Enums.quote_status]);
    expect([...PRODUCT_STATUSES]).toEqual([...Constants.public.Enums.product_status]);
    expect([...PUBLISH_STATUSES]).toEqual([...Constants.public.Enums.publish_status]);
  });

  it('have a label for each status', () => {
    expect(Object.keys(quoteStatusLabels)).toEqual([...QUOTE_STATUSES]);
    expect(Object.keys(productStatusLabels)).toEqual([...PRODUCT_STATUSES]);
    expect(publishStatusLabels).toEqual({
      queued: 'En cola',
      running: 'Publicando',
      success: 'Publicado',
      failed: 'Falló',
    });
  });
});
