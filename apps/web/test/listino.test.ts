import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { categories, services } from '../src/content/listino';
import { formatDuration, formatPrice } from '../src/lib/format';

interface YamlService {
  slug: string;
  cat: string;
  it: string;
  en: string;
  price: number;
  from: boolean;
  online?: boolean;
  steps: [number, boolean, string | null][];
}

const doc = readFileSync(new URL('../../../docs/21-dati-mock.md', import.meta.url), 'utf8');
const yamlBlock = /```yaml\n([\s\S]*?)```/.exec(doc)?.[1] ?? '';
const seed = parse(yamlBlock) as { services: YamlService[] };

describe('listino del sito ↔ docs/21 (fonte)', () => {
  it('stessi servizi, nomi, prezzi, "a partire da", durate e prenotabilità online', () => {
    expect(services.map((s) => s.slug)).toEqual(seed.services.map((s) => s.slug));
    for (const y of seed.services) {
      const s = services.find((x) => x.slug === y.slug)!;
      expect(s.category).toBe(y.cat);
      expect(s.name).toEqual({ it: y.it, en: y.en });
      expect(s.priceCents).toBe(y.price);
      expect(s.priceIsFrom).toBe(y.from);
      expect(s.durationMin).toBe(y.steps.reduce((sum, st) => sum + st[0], 0));
      expect(s.onlineBookable).toBe(y.online ?? true);
    }
  });

  it('ogni servizio appartiene a una categoria esistente', () => {
    for (const s of services) expect(categories.map((c) => c.key)).toContain(s.category);
  });
});

describe('formattazione', () => {
  it('prezzi in euro, IVA inclusa, con "da" / "from"', () => {
    expect(formatPrice(2500, false, 'it')).toMatch(/^25\s?€$/);
    expect(formatPrice(6500, true, 'it')).toMatch(/^da 65\s?€$/);
    expect(formatPrice(6500, true, 'en')).toBe('from €65');
    expect(formatPrice(3250, false, 'en')).toBe('€32.50');
    expect(formatPrice(0, false, 'it')).toBe('Gratuita');
    expect(formatPrice(0, false, 'en')).toBe('Free');
  });

  it('durate leggibili', () => {
    expect(formatDuration(40)).toBe('40 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(105)).toBe('1 h 45 min');
  });
});
