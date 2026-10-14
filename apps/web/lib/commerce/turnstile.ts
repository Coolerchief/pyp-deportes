'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Cloudflare Turnstile, rendered by hand (render=explicit) only on step 2 of /cotizacion. */
export const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type RenderOptions = {
  sitekey: string;
  appearance?: 'always' | 'execute' | 'interaction-only';
  action?: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => boolean | void;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
};

export type TurnstileApi = {
  render(container: HTMLElement, options: RenderOptions): string | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

/** Loads api.js once; a failed load can be tried again. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin navegador.'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile no cargó.'));
    script.onerror = () => reject(new Error('Turnstile no cargó.'));
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

/**
 * One invisible widget that keeps a fresh token ready. `take()` hands it over (each token works
 * once) and resets the widget for the next attempt; without a token yet, it waits up to
 * `timeoutMs`. Errors and timeouts reject: the caller sends without folio.
 */
export function createTokenSource(api: TurnstileApi, container: HTMLElement, sitekey: string) {
  let token: string | null = null;
  let failed = false;
  let waiters: { resolve: (token: string) => void; reject: (error: Error) => void }[] = [];

  const settle = (fn: (w: (typeof waiters)[number]) => void) => {
    const current = waiters;
    waiters = [];
    current.forEach(fn);
  };

  const widgetId = api.render(container, {
    sitekey,
    appearance: 'interaction-only',
    action: 'submit_quote',
    'refresh-expired': 'auto',
    callback(value) {
      failed = false;
      if (waiters.length > 0) settle((w) => w.resolve(value));
      else token = value;
    },
    'expired-callback'() {
      token = null;
    },
    'error-callback'() {
      token = null;
      failed = true;
      settle((w) => w.reject(new Error('Turnstile falló.')));
      return true;
    },
  });

  function renew() {
    if (!widgetId) return;
    failed = false;
    api.reset(widgetId);
  }

  return {
    take(timeoutMs: number): Promise<string> {
      if (!widgetId) return Promise.reject(new Error('Turnstile no se pudo mostrar.'));
      if (token) {
        const value = token;
        token = null;
        renew();
        return Promise.resolve(value);
      }
      if (failed) renew();
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          waiters = waiters.filter((w) => w !== waiter);
          reject(new Error('Turnstile tardó demasiado.'));
        }, timeoutMs);
        const waiter = {
          resolve: (value: string) => {
            clearTimeout(timer);
            // This token is now used: prepare the next one.
            queueMicrotask(renew);
            resolve(value);
          },
          reject: (error: Error) => {
            clearTimeout(timer);
            reject(error);
          },
        };
        waiters.push(waiter);
      });
    },
    remove() {
      if (widgetId) api.remove(widgetId);
    },
  };
}

type TokenSource = ReturnType<typeof createTokenSource>;

/**
 * Renders the widget into the returned ref once mounted (step 2), so a token is usually ready
 * by the time the visitor sends. `takeToken` rejects without a site key or if api.js fails.
 */
export function useTurnstile(sitekey: string | null) {
  const container = useRef<HTMLDivElement>(null);
  const source = useRef<Promise<TokenSource> | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!sitekey || !element) return;
    const pending = loadTurnstile().then((api) => createTokenSource(api, element, sitekey));
    source.current = pending;
    // Keep an unhandled rejection away; takeToken reports the failure.
    pending.catch(() => {});
    return () => {
      source.current = null;
      void pending.then((s) => s.remove()).catch(() => {});
    };
  }, [sitekey]);

  const takeToken = useCallback((timeoutMs: number): Promise<string> => {
    const pending = source.current;
    if (!pending) return Promise.reject(new Error('Turnstile no está configurado.'));
    // The limit also covers a slow api.js download.
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Turnstile tardó demasiado.')), timeoutMs);
      pending
        .then((tokens) => tokens.take(timeoutMs))
        .then(resolve, reject)
        .finally(() => clearTimeout(timer));
    });
  }, []);

  return { container, takeToken };
}
