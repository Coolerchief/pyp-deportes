import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// /admin (TRD §8): static pages that run in the browser. Never indexed, whatever the domain.
export const metadata: Metadata = {
  title: 'Panel · P&P Deportes Coapa',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
