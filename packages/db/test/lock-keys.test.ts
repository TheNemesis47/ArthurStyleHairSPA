import { describe, expect, it } from 'vitest';
import { advisoryLockKeys } from '../src/lock-keys.ts';
import { pgCode } from '../src/errors.ts';

const iv = (start: string, end: string) => ({ start: Date.parse(start), end: Date.parse(end) });

describe('advisoryLockKeys', () => {
  it('una chiave per risorsa e giorno locale, ordinate e senza duplicati', () => {
    const keys = advisoryLockKeys(
      [
        { resourceId: 'p1', interval: iv('2026-11-03T09:00:00Z', '2026-11-03T09:25:00Z') },
        { resourceId: 'arturo', interval: iv('2026-11-03T09:00:00Z', '2026-11-03T09:25:00Z') },
        { resourceId: 'p1', interval: iv('2026-11-03T10:00:00Z', '2026-11-03T10:30:00Z') },
      ],
      'Europe/Rome',
    );
    expect(keys).toEqual(['arturo:2026-11-03', 'p1:2026-11-03']);
  });

  it('usa il giorno LOCALE della sede, non quello UTC', () => {
    // 23:30 UTC del 2 novembre = 00:30 del 3 novembre a Roma
    expect(
      advisoryLockKeys(
        [{ resourceId: 'r', interval: iv('2026-11-02T23:30:00Z', '2026-11-02T23:45:00Z') }],
        'Europe/Rome',
      ),
    ).toEqual(['r:2026-11-03']);
  });
});

describe('pgCode', () => {
  it('estrae lo SQLSTATE solo da oggetti errore validi', () => {
    expect(pgCode({ code: '23P01' })).toBe('23P01');
    expect(pgCode(new Error('x'))).toBeUndefined();
    expect(pgCode(null)).toBeUndefined();
    expect(pgCode({ code: 42 })).toBeUndefined();
  });
});
