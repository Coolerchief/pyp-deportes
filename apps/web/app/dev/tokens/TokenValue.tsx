'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** Shows the computed value of a CSS custom property, so the page reads the real theme. */
export function TokenValue({ name }: { name: string }) {
  const value = useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    () => '',
  );
  return <code className="type-caption text-grafito-suave">{value || name}</code>;
}
