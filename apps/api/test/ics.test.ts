import { describe, expect, it } from 'vitest';
import { redactUrl } from '../src/app.ts';
import { bookingIcs, escapeText, fold } from '../src/ics.ts';

describe('file .ics (RFC 5545)', () => {
  const base = {
    uid: 'id@arthur-style',
    sequence: 2,
    start: Date.UTC(2026, 10, 10, 8, 0),
    end: Date.UTC(2026, 10, 10, 9, 5),
    stamp: Date.UTC(2026, 10, 2, 7, 0),
    summary: 'Arthur Style — Taglio, piega; colore',
    location: 'Firenze',
    description: 'riga 1\nriga 2',
    cancelled: false,
  };

  it('righe CRLF, orari UTC, testo con caratteri speciali escapati', () => {
    const ics = bookingIcs(base);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.split('\r\n')).toContain('DTSTART:20261110T080000Z');
    expect(ics).toContain('SUMMARY:Arthur Style — Taglio\\, piega\\; colore');
    expect(ics).toContain('DESCRIPTION:riga 1\\nriga 2');
    expect(ics).toContain('SEQUENCE:2');
    expect(bookingIcs({ ...base, cancelled: true })).toContain('STATUS:CANCELLED');
  });

  it('nessuna riga oltre 75 ottetti, senza spezzare i caratteri multibyte', () => {
    const long = fold(`SUMMARY:${'è'.repeat(100)}`);
    for (const line of long.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    expect(long.replace(/\r\n /g, '')).toBe(`SUMMARY:${'è'.repeat(100)}`);
  });

  it('escapeText toglie i caratteri di controllo (niente righe iniettate)', () => {
    expect(escapeText('a\r\nBEGIN:VEVENT\u0000')).toBe('a\\nBEGIN:VEVENT');
  });
});

describe('log', () => {
  it('il token del link di gestione non finisce nei log', () => {
    expect(redactUrl('/v1/manage/AbC_123-xyz/ics?x=1')).toBe('/v1/manage/***/ics?x=1');
    expect(redactUrl('/v1/locations')).toBe('/v1/locations');
  });
});
