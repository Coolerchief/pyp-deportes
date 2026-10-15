import { describe, expect, it, vi } from 'vitest';
import { authErrorMessage, fetchStaff, loginHref, loginReason, safeNext } from './access';

describe('safeNext', () => {
  it('only returns paths inside /admin', () => {
    expect(safeNext('/admin/productos?q=balón')).toBe('/admin/productos?q=balón');
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext(null)).toBe('/admin');
    expect(safeNext('https://evil.example/admin')).toBe('/admin');
    expect(safeNext('//evil.example')).toBe('/admin');
    expect(safeNext('/admin//evil.example')).toBe('/admin');
    expect(safeNext('/admin\\evil')).toBe('/admin');
    expect(safeNext('/administrador')).toBe('/admin');
    expect(safeNext('/admin/login')).toBe('/admin');
    expect(safeNext('/catalogo')).toBe('/admin');
  });

  it('builds the login link with where to return and why', () => {
    expect(loginHref('/admin/solicitudes')).toBe('/admin/login?next=%2Fadmin%2Fsolicitudes');
    expect(loginHref('/admin')).toBe('/admin/login');
    expect(loginHref(undefined, 'sin-acceso')).toBe('/admin/login?motivo=sin-acceso');
    expect(loginReason('salida')).toBe('salida');
    expect(loginReason('otra')).toBeNull();
  });
});

describe('authErrorMessage', () => {
  it('says what happened in plain Spanish', () => {
    expect(authErrorMessage({ code: 'invalid_credentials' })).toBe(
      'Correo o contraseña incorrectos.',
    );
    expect(authErrorMessage({ code: 'over_request_rate_limit', status: 429 })).toMatch(
      /Demasiados intentos/,
    );
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toMatch(
      /No pudimos conectar/,
    );
    expect(authErrorMessage({ code: 'email_not_confirmed' })).toMatch(/Confirma tu correo/);
    expect(authErrorMessage({})).toBe('No pudimos iniciar sesión. Inténtalo de nuevo.');
  });
});

function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: unknown[][] = [];
  const query = {
    select: (...a: unknown[]) => (calls.push(['select', ...a]), query),
    eq: (...a: unknown[]) => (calls.push(['eq', ...a]), query),
    maybeSingle: vi.fn(async () => result),
  };
  const client = { from: (table: string) => (calls.push(['from', table]), query) };
  return { client: client as never, calls };
}

describe('fetchStaff', () => {
  const user = { id: 'u1', email: 'ana@pyp.test' };

  it('reads the own row of staff_members', async () => {
    const { client, calls } = fakeClient({
      data: { role: 'editor', full_name: 'Ana', is_active: true },
      error: null,
    });
    expect(await fetchStaff(client, user)).toEqual({
      userId: 'u1',
      email: 'ana@pyp.test',
      fullName: 'Ana',
      role: 'editor',
    });
    expect(calls).toEqual([
      ['from', 'staff_members'],
      ['select', 'role, full_name, is_active'],
      ['eq', 'user_id', 'u1'],
    ]);
  });

  it('gives no access without a row (not staff) or when inactive', async () => {
    expect(await fetchStaff(fakeClient({ data: null, error: null }).client, user)).toBeNull();
    expect(
      await fetchStaff(
        fakeClient({ data: { role: 'admin', full_name: 'X', is_active: false }, error: null })
          .client,
        user,
      ),
    ).toBeNull();
  });

  it('throws when the query fails, so the gate can say so', async () => {
    await expect(
      fetchStaff(fakeClient({ data: null, error: new Error('red') }).client, user),
    ).rejects.toThrow('red');
  });
});
