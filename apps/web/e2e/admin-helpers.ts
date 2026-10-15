import type { Page } from '@playwright/test';

// Stubbed Supabase for the panel's E2E tests (T4.1–T4.3): the real supabase-js talks to Auth and
// PostgREST routes answered here. The values are invented; nothing reaches a real project.

export const USER = { id: '00000000-0000-4000-8000-0000000000a1', email: 'ana@pyp.test' };

function fakeJwt() {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({
    sub: USER.id,
    email: USER.email,
    role: 'authenticated',
    aud: 'authenticated',
    exp,
  })}.firma`;
}

export const STATS = {
  newCount: 3,
  last7Days: 5,
  last30Days: 12,
  byStatus: { new: 3, in_progress: 2, quoted: 4, won: 2, lost: 1 },
  productsWithoutPhoto: 56,
  topProducts: [
    { productId: 'p1', name: 'Balón de Fútbol No. 5', sku: 'BAL-001', pieces: 40, requests: 2 },
  ],
};

export type StaffRow = { role: 'admin' | 'editor'; full_name: string; is_active: boolean };

export async function stubSupabase(
  page: Page,
  row: StaffRow | null,
  options: { badPassword?: boolean } = {},
) {
  const calls = { logout: 0, staff: 0 };
  await page.route('**/auth/v1/token?grant_type=password', (route) => {
    if (options.badPassword) {
      return route.fulfill({
        status: 400,
        json: {
          code: 'invalid_credentials',
          error_code: 'invalid_credentials',
          msg: 'Invalid login credentials',
        },
      });
    }
    const now = Math.floor(Date.now() / 1000);
    return route.fulfill({
      json: {
        access_token: fakeJwt(),
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'refresh-de-prueba',
        user: {
          ...USER,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: {},
        },
      },
    });
  });
  await page.route('**/auth/v1/logout**', (route) => {
    calls.logout += 1;
    return route.fulfill({ status: 204 });
  });
  await page.route('**/rest/v1/staff_members**', (route) => {
    calls.staff += 1;
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    if (single) {
      return row
        ? route.fulfill({ json: row })
        : route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'no rows' } });
    }
    return route.fulfill({ json: row ? [row] : [] });
  });
  // Panel home (T4.2).
  await page.route('**/rest/v1/rpc/admin_dashboard_stats', (route) =>
    route.fulfill({ json: STATS }),
  );
  await page.route('**/rest/v1/rpc/has_unpublished_changes', (route) =>
    route.fulfill({ json: true }),
  );
  // No publish yet: an empty list (or "no rows" when asked for one object).
  await page.route('**/rest/v1/publish_runs**', (route) => {
    const single = (route.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    return single
      ? route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'no rows' } })
      : route.fulfill({ json: [] });
  });
  return calls;
}

export async function logIn(page: Page) {
  await page.getByLabel('Correo').fill(USER.email);
  await page.getByLabel('Contraseña').fill('contraseña-de-prueba');
  await page.getByRole('button', { name: 'Entrar' }).click();
}
