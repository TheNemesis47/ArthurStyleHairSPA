import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

describe('configurazione', () => {
  it('valori validi e default', () => {
    const c = loadConfig({
      DATABASE_URL: 'postgresql://app@db:5432/arthur',
      ORGANIZATION_SLUG: 'arthur-style',
      CORS_ORIGINS: 'https://example.com, https://admin.example.com',
    });
    expect(c.PORT).toBe(3200);
    expect(c.CORS_ORIGINS).toEqual(['https://example.com', 'https://admin.example.com']);
  });

  it('errore con i soli NOMI delle variabili sbagliate, mai i valori', () => {
    const secret = 'postgresql://utente:passwordsegreta@';
    expect(() => loadConfig({ DATABASE_URL: secret, ORGANIZATION_SLUG: 'A B' })).toThrow(
      /DATABASE_URL, ORGANIZATION_SLUG/,
    );
    try {
      loadConfig({ DATABASE_URL: secret });
    } catch (e) {
      expect((e as Error).message).not.toContain('passwordsegreta');
    }
  });
});
