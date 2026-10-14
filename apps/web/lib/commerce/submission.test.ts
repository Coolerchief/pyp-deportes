import { beforeEach, describe, expect, it } from 'vitest';
import {
  LAST_QUOTE_KEY,
  loadLastQuote,
  saveLastQuote,
  sentParam,
  useSubmission,
} from './submission';

const WA = 'https://wa.me/525500000000?text=hola';

beforeEach(() => window.sessionStorage.clear());

describe('last quote', () => {
  it('?enviada= is the folio, or 1 without folio', () => {
    expect(sentParam('PYP-2026-000123')).toBe('PYP-2026-000123');
    expect(sentParam(null)).toBe('1');
  });

  it('shows the saved send again only for its own ?enviada=', () => {
    saveLastQuote({ folio: 'PYP-2026-000123', waUrl: WA });
    expect(loadLastQuote('PYP-2026-000123')).toEqual({ folio: 'PYP-2026-000123', waUrl: WA });
    expect(loadLastQuote('PYP-2026-000999')).toBeNull();
    expect(loadLastQuote('1')).toBeNull();

    saveLastQuote({ folio: null, waUrl: WA });
    expect(loadLastQuote('1')).toEqual({ folio: null, waUrl: WA });
  });

  it('ignores broken or foreign data', () => {
    window.sessionStorage.setItem(LAST_QUOTE_KEY, '{');
    expect(loadLastQuote('1')).toBeNull();
    window.sessionStorage.setItem(
      LAST_QUOTE_KEY,
      JSON.stringify({ folio: null, waUrl: 'https://evil.example' }),
    );
    expect(loadLastQuote('1')).toBeNull();
  });
});

describe('useSubmission', () => {
  it('keeps the clientRequestId until a saved send renews it', () => {
    const first = useSubmission.getState().ensureRequestId();
    expect(useSubmission.getState().ensureRequestId()).toBe(first);
    useSubmission.getState().renewRequestId();
    expect(useSubmission.getState().ensureRequestId()).not.toBe(first);
  });
});
