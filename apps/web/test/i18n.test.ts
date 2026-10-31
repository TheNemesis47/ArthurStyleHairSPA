import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/messages/en';
import { it as itMsg } from '../src/i18n/messages/it';
import { legalNav, mainNav, pageKeys, routes } from '../src/i18n/routes';

function keysOf(o: unknown, prefix = ''): string[] {
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return [prefix];
  return Object.entries(o).flatMap(([k, v]) => keysOf(v, prefix === '' ? k : `${prefix}.${k}`));
}

describe('rotte IT/EN', () => {
  it('ogni pagina ha un percorso italiano senza prefisso e uno inglese sotto /en', () => {
    for (const key of pageKeys) {
      expect(routes[key].it.startsWith('/en')).toBe(false);
      expect(routes[key].en === '/en' || routes[key].en.startsWith('/en/')).toBe(true);
    }
  });

  it('nessun percorso duplicato', () => {
    const all = pageKeys.flatMap((k) => [routes[k].it, routes[k].en]);
    expect(new Set(all).size).toBe(all.length);
  });

  it('menu e link legali puntano a pagine esistenti', () => {
    for (const k of [...mainNav, ...legalNav]) expect(pageKeys).toContain(k);
  });
});

describe('dizionari', () => {
  it('italiano e inglese hanno le stesse chiavi', () => {
    expect(keysOf(en).sort()).toEqual(keysOf(itMsg).sort());
  });

  it('ogni pagina ha titolo e descrizione in entrambe le lingue, descrizioni SEO tra 50 e 170 caratteri', () => {
    for (const key of pageKeys)
      for (const m of [itMsg, en]) {
        expect(m.meta[key].title.length).toBeGreaterThan(2);
        expect(m.meta[key].description.length).toBeGreaterThanOrEqual(50);
        expect(m.meta[key].description.length).toBeLessThanOrEqual(170);
      }
  });

  it('nessun testo vuoto', () => {
    const strings = (o: unknown): string[] =>
      typeof o === 'string'
        ? [o]
        : typeof o === 'object' && o !== null
          ? Object.values(o).flatMap(strings)
          : [];
    for (const s of [...strings(itMsg), ...strings(en)]) expect(s.trim().length).toBeGreaterThan(0);
  });
});
