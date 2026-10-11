import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    settings: { next: { rootDir: 'apps/web' } },
  },
  globalIgnores([
    '.venv/**',
    'design/**',
    'docs/**',
    '**/node_modules/**',
    '**/.next/**',
    '**/out/**',
    '**/next-env.d.ts',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/.wrangler/**',
    'packages/shared/database.types.ts',
  ]),
]);
