import { expect, type Page, test } from '@playwright/test';

// Next's route announcer is also role="alert": messages are found by their text.

// T4.1: access to /admin with the real supabase-js against a stubbed Supabase (Auth and
// PostgREST). The test values are invented; nothing reaches a real project.

const USER = { id: '00000000-0000-4000-8000-0000000000a1', email: 'ana@pyp.test' };

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

type StaffRow = { role: 'admin' | 'editor'; full_name: string; is_active: boolean };

async function stubSupabase(
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
  return calls;
}

async function logIn(page: Page) {
  await page.getByLabel('Correo').fill(USER.email);
  await page.getByLabel('Contraseña').fill('contraseña-de-prueba');
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('the panel sends a visitor without session to the login', async ({ page }) => {
  await page.goto('/admin', { waitUntil: 'commit' });
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'Panel de administración' })).toBeVisible();
  // Never indexed.
  const robots = await page.locator('meta[name="robots"]').all();
  expect(robots.length).toBeGreaterThan(0);
  for (const meta of robots) expect(await meta.getAttribute('content')).toMatch(/noindex/);
});

test('a user who is not staff is signed out with a clear message', async ({ page }) => {
  const calls = await stubSupabase(page, null);
  await page.goto('/admin/login');
  await logIn(page);
  await expect(
    page.getByRole('alert').filter({ hasText: 'Tu cuenta no tiene acceso al panel.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(calls.logout).toBe(1);
  // No session is left behind: the panel still sends to the login.
  await page.goto('/admin', { waitUntil: 'commit' });
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('wrong credentials are explained', async ({ page }) => {
  await stubSupabase(page, null, { badPassword: true });
  await page.goto('/admin/login');
  await logIn(page);
  await expect(
    page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos.' }),
  ).toBeVisible();
});

test('staff log in, see the panel, and sign out', async ({ page }) => {
  const calls = await stubSupabase(page, {
    role: 'admin',
    full_name: 'Ana López',
    is_active: true,
  });
  await page.goto('/admin/login');
  await logIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Hola, Ana López' })).toBeVisible();

  // The session survives a reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hola, Ana López' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/admin\/login\?motivo=salida$/);
  await expect(page.getByRole('status')).toContainText('Cerraste sesión.');
  expect(calls.logout).toBe(1);
  await page.goto('/admin', { waitUntil: 'commit' });
  await expect(page).toHaveURL(/\/admin\/login/);
});
