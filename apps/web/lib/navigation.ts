// Navigation and contact data for the header, menus, footer and WhatsApp button (T2.2). Built
// once from the build data: sports, top-level categories and store details come from the
// database (rule 4), only the routes and their labels live here.

import {
  type CatalogJson,
  formatPhone,
  formatStoreHours,
  type SettingsJson,
  storeHoursLines,
  telUrl,
  whatsappUrl,
} from '@pyp/shared';

export type NavLink = { href: string; label: string };

export type SiteNav = {
  siteName: string;
  sports: NavLink[];
  /** Top-level categories only (10 today); subcategories live in the listing filters. */
  categories: NavLink[];
  /** Header and menu pages, in the design's order. */
  pages: { uniforms: NavLink; teams: NavLink; visit: NavLink };
  contact: {
    whatsappUrl: string;
    phone: string | null;
    phoneHref: string | null;
    hours: string;
    /** One line per hours block (desktop footer). */
    hoursLines: string[];
    addressLine: string;
    /** Footer on desktop: street on one line, neighborhood, borough and city on the next. */
    addressLines: [string, string];
    instagram: NavLink | null;
    facebook: NavLink | null;
  };
};

export const ROUTES = {
  home: '/',
  catalog: '/catalogo',
  category: (slug: string) => `/catalogo/${slug}`,
  subcategory: (category: string, slug: string) => `/catalogo/${category}/${slug}`,
  brand: (slug: string) => `/marca/${slug}`,
  sport: (slug: string) => `/deporte/${slug}`,
  product: (slug: string) => `/producto/${slug}`,
  search: '/buscar',
  quote: '/cotizacion',
  uniforms: '/uniformes-personalizados',
  teams: '/equipos',
  visit: '/visitanos',
  about: '/visitanos#nosotros',
  privacy: '/aviso-de-privacidad',
} as const;

/** The section of the header that a path belongs to (red underline on desktop). */
export function activeSection(pathname: string): 'uniforms' | 'teams' | 'visit' | null {
  if (pathname.startsWith(ROUTES.uniforms)) return 'uniforms';
  if (pathname.startsWith(ROUTES.teams)) return 'teams';
  if (pathname.startsWith(ROUTES.visit)) return 'visit';
  return null;
}

/** CDMX is how the design writes Ciudad de México in short addresses. */
export function shortCity(city: string): string {
  return city.trim().toLowerCase() === 'ciudad de méxico' ? 'CDMX' : city;
}

export function buildSiteNav(catalog: CatalogJson, settings: SettingsJson): SiteNav {
  const { store, social } = settings;
  const area = `${store.neighborhood}, ${store.borough}, ${shortCity(store.city)}`;
  return {
    siteName: settings.siteName,
    sports: catalog.sports.map((s) => ({ href: ROUTES.sport(s.slug), label: s.name })),
    categories: catalog.categories
      .filter((c) => c.parent === null)
      .map((c) => ({ href: ROUTES.category(c.slug), label: c.name })),
    pages: {
      uniforms: { href: ROUTES.uniforms, label: 'Uniformes a tu medida' },
      teams: { href: ROUTES.teams, label: 'Equipos estrenando' },
      visit: { href: ROUTES.visit, label: 'Visítanos' },
    },
    contact: {
      whatsappUrl: whatsappUrl(settings.whatsappSalesNumber),
      phone: store.phone ? formatPhone(store.phone) : null,
      phoneHref: store.phone ? telUrl(store.phone) : null,
      hours: formatStoreHours(store.hours),
      hoursLines: storeHoursLines(store.hours),
      addressLine: `${store.street}, ${area}`,
      addressLines: [store.street, area],
      instagram: social.instagram
        ? { href: `https://www.instagram.com/${social.instagram}`, label: `@${social.instagram}` }
        : null,
      facebook: social.facebook
        ? { href: `https://www.facebook.com/${social.facebook}`, label: `/${social.facebook}` }
        : null,
    },
  };
}
