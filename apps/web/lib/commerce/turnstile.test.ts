import { describe, expect, it, vi } from 'vitest';
import { createTokenSource, type TurnstileApi } from './turnstile';

type Options = Parameters<TurnstileApi['render']>[1];

function fakeApi() {
  let options: Options | null = null;
  const api = {
    render: vi.fn((_el: HTMLElement, o: Options) => {
      options = o;
      return 'w1';
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  return {
    api,
    issue: (token: string) => options?.callback?.(token),
    fail: () => options?.['error-callback']?.(),
    opts: () => options,
  };
}

describe('createTokenSource', () => {
  it('renders an invisible widget and hands over the ready token once', async () => {
    const { api, issue, opts } = fakeApi();
    const tokens = createTokenSource(api, document.createElement('div'), 'site-key');
    expect(opts()).toMatchObject({ sitekey: 'site-key', appearance: 'interaction-only' });
    issue('t1');
    await expect(tokens.take(100)).resolves.toBe('t1');
    // Used: the widget is reset for the next attempt.
    expect(api.reset).toHaveBeenCalledWith('w1');
  });

  it('waits for the token when it is not ready yet', async () => {
    const { api, issue } = fakeApi();
    const tokens = createTokenSource(api, document.createElement('div'), 'k');
    const pending = tokens.take(1000);
    issue('t2');
    await expect(pending).resolves.toBe('t2');
  });

  it('rejects on a widget error and on timeout', async () => {
    const { api, fail } = fakeApi();
    const tokens = createTokenSource(api, document.createElement('div'), 'k');
    const pending = tokens.take(1000);
    fail();
    await expect(pending).rejects.toThrow('Turnstile falló.');
    await expect(tokens.take(10)).rejects.toThrow('Turnstile tardó demasiado.');
  });
});
