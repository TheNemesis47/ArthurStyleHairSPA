import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

const BASE = {
  DATABASE_URL: 'postgresql://app@db:5432/arthur',
  ORGANIZATION_SLUG: 'arthur-style',
  HOLD_COOKIE_SECRET: 'h'.repeat(32),
  OTP_SECRET: 'o'.repeat(32),
  TURNSTILE_SECRET: '1x0000000000000000000000000000000AA',
  MAIL_TRANSPORT: 'dev-file',
};

describe('configurazione', () => {
  it('valori validi e default', () => {
    const c = loadConfig({ ...BASE, CORS_ORIGINS: 'https://example.com, https://admin.example.com' });
    expect(c.PORT).toBe(3200);
    expect(c.NODE_ENV).toBe('development');
    expect(c.CORS_ORIGINS).toEqual(['https://example.com', 'https://admin.example.com']);
  });

  it('errore con i soli NOMI delle variabili sbagliate, mai i valori', () => {
    const secret = 'postgresql://utente:passwordsegreta@';
    expect(() => loadConfig({ ...BASE, DATABASE_URL: secret, ORGANIZATION_SLUG: 'A B' })).toThrow(
      /DATABASE_URL, ORGANIZATION_SLUG/,
    );
    try {
      loadConfig({ DATABASE_URL: secret });
    } catch (e) {
      expect((e as Error).message).not.toContain('passwordsegreta');
    }
  });

  it('segreti obbligatori, lunghi almeno 32 caratteri e diversi tra loro', () => {
    const withoutSecrets = { ...BASE, HOLD_COOKIE_SECRET: undefined, OTP_SECRET: undefined };
    expect(() => loadConfig(withoutSecrets)).toThrow(/HOLD_COOKIE_SECRET, OTP_SECRET/);
    expect(() => loadConfig({ ...BASE, OTP_SECRET: 'corto' })).toThrow(/OTP_SECRET/);
    expect(() => loadConfig({ ...BASE, OTP_SECRET: BASE.HOLD_COOKIE_SECRET })).toThrow(/OTP_SECRET/);
  });

  it('in produzione: niente email su file, niente chiavi di test Turnstile, hostname obbligatori', () => {
    expect(() => loadConfig({ ...BASE, NODE_ENV: 'production' })).toThrow(
      /MAIL_TRANSPORT, TURNSTILE_SECRET, TURNSTILE_HOSTNAMES/,
    );
  });
});
