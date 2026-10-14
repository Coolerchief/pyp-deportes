import { describe, expect, it } from 'vitest';
import {
  directionsUrl,
  firstName,
  formatPhone,
  formatStoreHours,
  initials,
  storeHoursLines,
  storeStatus,
  telUrl,
  whatsappUrl,
} from './contact.ts';

describe('formatPhone', () => {
  it('groups a 10-digit number as 2 + 4 + 4', () => {
    expect(formatPhone('5565822426')).toBe('55 6582 2426');
    expect(formatPhone('55-6582-2426')).toBe('55 6582 2426');
  });

  it('leaves other lengths as they are', () => {
    expect(formatPhone('12345')).toBe('12345');
  });

  it('builds a tel: link with the country code', () => {
    expect(telUrl('55 6582 2426')).toBe('tel:+525565822426');
  });
});

describe('formatStoreHours', () => {
  const seed = [
    { days: [1, 2, 3, 4, 5], open: '10:00', close: '19:00' },
    { days: [6], open: '10:00', close: '17:00' },
  ];

  it('writes the hours of the design', () => {
    expect(formatStoreHours(seed)).toBe('Lun–Vie 10:00–19:00 · Sáb 10:00–17:00');
    expect(storeHoursLines(seed)).toEqual(['Lun–Vie 10:00–19:00', 'Sáb 10:00–17:00']);
  });

  it('splits days that are not consecutive and ignores order and repeats', () => {
    expect(formatStoreHours([{ days: [7, 1, 3, 3, 2], open: '09:00', close: '14:00' }])).toBe(
      'Lun–Mié, Dom 09:00–14:00',
    );
  });

  it('is empty without hours', () => {
    expect(formatStoreHours([])).toBe('');
  });
});

describe('whatsappUrl', () => {
  it('points wa.me to the Mexican number', () => {
    expect(whatsappUrl('5500000000')).toBe('https://wa.me/525500000000');
  });

  it('encodes the message', () => {
    expect(whatsappUrl('5500000000', 'Hola, ¿tienen balones #5?')).toBe(
      'https://wa.me/525500000000?text=Hola%2C%20%C2%BFtienen%20balones%20%235%3F',
    );
  });
});

describe('storeStatus', () => {
  const hours = [
    { days: [1, 2, 3, 4, 5], open: '10:00', close: '19:00' },
    { days: [6], open: '10:00', close: '17:00' },
  ];
  // Mexico City is UTC-6 all year (no daylight saving since 2022).
  const at = (iso: string) => new Date(`${iso}-06:00`);

  it('says when it closes while open', () => {
    expect(storeStatus(hours, at('2026-10-14T12:30:00'))).toEqual({
      open: true,
      text: 'Abierto ahora · cierra 19:00',
    });
    expect(storeStatus(hours, at('2026-10-17T16:59:00'))?.text).toBe(
      'Abierto ahora · cierra 17:00',
    );
  });

  it('says when it opens while closed', () => {
    expect(storeStatus(hours, at('2026-10-14T08:00:00'))?.text).toBe('Cerrado · abre hoy 10:00');
    expect(storeStatus(hours, at('2026-10-14T19:00:00'))?.text).toBe('Cerrado · abre mañana 10:00');
    expect(storeStatus(hours, at('2026-10-17T18:00:00'))?.text).toBe(
      'Cerrado · abre el lunes 10:00',
    );
    expect(storeStatus(hours, at('2026-10-18T11:00:00'))?.text).toBe('Cerrado · abre mañana 10:00');
  });

  it('is null without hours', () => {
    expect(storeStatus([], new Date())).toBeNull();
  });
});

describe('directionsUrl, firstName and initials', () => {
  it('points Google Maps to the coordinates or the address', () => {
    const store = {
      lat: 19.3005,
      lng: -99.127,
      street: 'Calz. del Hueso 921',
      neighborhood: 'Granjas Coapa',
      city: 'Ciudad de México',
    };
    expect(directionsUrl(store)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=19.3005%2C-99.127',
    );
    expect(directionsUrl({ ...store, lat: null, lng: null })).toContain('Calz.%20del%20Hueso');
  });

  it('reads the advisor name without the brackets of pending data', () => {
    expect(firstName('[Ana Martínez]')).toBe('Ana');
    expect(initials('[Ana Martínez]')).toBe('AM');
    expect(initials('Luis')).toBe('L');
  });
});
