// @vitest-environment node
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadBuildData } from './data';
import { activeSection, buildSiteNav } from './navigation';

const fixture = (name: string) => resolve(__dirname, `../fixtures/${name}`);

describe('buildSiteNav', () => {
  it('takes sports, top-level categories and store data from the build data', async () => {
    const { catalog, settings } = await loadBuildData({
      BUILD_DATA_FILE: fixture('build-data.json'),
    });
    const nav = buildSiteNav(catalog, settings);
    expect(nav.sports).toHaveLength(7);
    expect(nav.sports[0]).toEqual({ href: '/deporte/futbol', label: 'Fútbol' });
    expect(nav.categories).toHaveLength(10);
    expect(nav.categories.every((c) => !c.href.includes('/', '/catalogo/'.length))).toBe(true);
    expect(nav.contact).toMatchObject({
      whatsappUrl: 'https://wa.me/525500000000',
      phone: '55 6582 2426',
      hours: 'Lun–Vie 10:00–19:00 · Sáb 10:00–17:00',
      addressLine: 'Calz. del Hueso 921, local 42, Granjas Coapa, Tlalpan, CDMX',
      instagram: { href: 'https://www.instagram.com/pyp_coapa', label: '@pyp_coapa' },
      facebook: { href: 'https://www.facebook.com/pypcoapa', label: '/pypcoapa' },
    });
  });

  it('works with the empty catalog of production', async () => {
    const { catalog, settings } = await loadBuildData({
      BUILD_DATA_FILE: fixture('build-data-empty.json'),
    });
    const nav = buildSiteNav(catalog, settings);
    expect(nav.sports).toEqual([]);
    expect(nav.categories).toEqual([]);
    expect(nav.contact.phone).toBe('55 6582 2426');
  });
});

describe('activeSection', () => {
  it('maps a path to its header section', () => {
    expect(activeSection('/uniformes-personalizados')).toBe('uniforms');
    expect(activeSection('/equipos')).toBe('teams');
    expect(activeSection('/visitanos')).toBe('visit');
    expect(activeSection('/catalogo/balones')).toBeNull();
  });
});
