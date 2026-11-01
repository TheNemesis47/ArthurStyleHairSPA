import { describe, expect, it } from 'vitest';
import { isValidLocalDate, toZonedIso } from '../src/index.js';

describe('toZonedIso', () => {
  it("istante → ISO 8601 con l'offset della sede, in inverno e in estate", () => {
    expect(toZonedIso(Date.UTC(2026, 10, 3, 9, 30), 'Europe/Rome')).toBe('2026-11-03T10:30:00+01:00');
    expect(toZonedIso(Date.UTC(2026, 6, 1, 8, 0), 'Europe/Rome')).toBe('2026-07-01T10:00:00+02:00');
    expect(toZonedIso(Date.UTC(2026, 6, 1, 8, 0), 'Europe/Malta')).toBe('2026-07-01T10:00:00+02:00');
  });

  it('tronca i millisecondi e non aggiunge il nome del fuso', () => {
    expect(toZonedIso(Date.UTC(2026, 10, 3, 9, 30, 15, 999), 'Europe/Rome')).toBe(
      '2026-11-03T10:30:15+01:00',
    );
  });
});

describe('isValidLocalDate', () => {
  it('accetta solo date reali nel formato YYYY-MM-DD', () => {
    expect(isValidLocalDate('2026-11-03')).toBe(true);
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('03/11/2026')).toBe(false);
    expect(isValidLocalDate('2026-11-3')).toBe(false);
  });
});
