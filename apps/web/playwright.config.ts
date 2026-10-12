import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

// Runs against the static build (apps/web/out); run `pnpm build` first.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: 'movil', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `serve out -l ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
