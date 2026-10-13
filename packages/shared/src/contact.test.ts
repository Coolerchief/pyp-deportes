import { describe, expect, it } from 'vitest';
import { formatPhone, formatStoreHours, storeHoursLines, telUrl, whatsappUrl } from './contact';

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
