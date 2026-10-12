import localFont from 'next/font/local';

// Only the faces the type scale uses (UI/UX §2.2), self-hosted and preloaded.
export const barlowCondensed = localFont({
  src: [
    { path: './fonts/barlow-condensed-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/barlow-condensed-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/barlow-condensed-latin-600-italic.woff2', weight: '600', style: 'italic' },
    { path: './fonts/barlow-condensed-latin-800-italic.woff2', weight: '800', style: 'italic' },
    { path: './fonts/barlow-condensed-latin-900-italic.woff2', weight: '900', style: 'italic' },
  ],
  variable: '--font-barlow-condensed',
  display: 'swap',
  fallback: ['Arial Narrow', 'Arial', 'sans-serif'],
});

export const barlow = localFont({
  src: [
    { path: './fonts/barlow-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/barlow-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/barlow-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-barlow',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});
