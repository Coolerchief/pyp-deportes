import { expect, test } from '@playwright/test';
import { logIn, stubSupabase } from './admin-helpers';

// Next's route announcer is also role="alert": messages are found by their text.

// T4.1: access to /admin with the real supabase-js against a stubbed Supabase (Auth and
// PostgREST). The test values are invented; nothing reaches a real project.

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
  // The owner sees new requests and the week's (T4.2).
  const fresh = page.locator('section', {
    has: page.getByRole('heading', { name: 'Solicitudes nuevas' }),
  });
  await expect(fresh.getByText('3', { exact: true })).toBeVisible();
  const week = page.locator('section', { has: page.getByRole('heading', { name: 'Esta semana' }) });
  await expect(week.getByText('5', { exact: true })).toBeVisible();
  await expect(page.getByText('Hay cambios sin publicar.')).toBeVisible();

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

test('the panel sections are one tap away on mobile and in the side bar on desktop', async ({
  page,
}, testInfo) => {
  await stubSupabase(page, { role: 'editor', full_name: 'Beto Ruiz', is_active: true });
  await page.goto('/admin/login');
  await logIn(page);
  await expect(page.getByRole('heading', { name: 'Hola, Beto Ruiz' })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Secciones del panel' });
  await expect(nav).toHaveCount(1);
  await expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Productos' }).click();
  await expect(page).toHaveURL(/\/admin\/productos$/);
  await expect(page.getByRole('heading', { name: 'Productos', level: 1 })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Productos' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  if (testInfo.project.name === 'movil') {
    // The bottom bar keeps three sections; the others are under "Más". No Ajustes for editors.
    await nav.getByRole('button', { name: 'Más' }).click();
    const sheet = page.getByRole('dialog', { name: 'Más secciones' });
    await expect(sheet.getByRole('link', { name: 'Ajustes' })).toHaveCount(0);
    await sheet.getByRole('link', { name: 'Fotos del sitio' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } else {
    await expect(nav.getByRole('link', { name: 'Ajustes' })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Fotos del sitio' }).click();
  }
  await expect(page).toHaveURL(/\/admin\/fotos$/);
  await expect(page.getByRole('heading', { name: 'Fotos del sitio', level: 1 })).toBeVisible();

  // Typing the address of Ajustes as an editor says it is for admins.
  await page.goto('/admin/ajustes');
  await expect(page.getByText('Solo un administrador puede abrir Ajustes.')).toBeVisible();
});
