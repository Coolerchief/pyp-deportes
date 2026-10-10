import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { barlow, barlowCondensed } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'P&P Deportes Coapa',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>{children}</body>
    </html>
  );
}
