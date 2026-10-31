import type { Locale } from './locales';

/**
 * Percorsi del sito per lingua (docs/08 §2). L'italiano è senza prefisso, l'inglese sotto /en.
 * Un'unica tabella: navigazione, cambio lingua, hreflang e sitemap la leggono tutti da qui.
 */
export const routes = {
  home: { it: '/', en: '/en' },
  arturo: { it: '/arturo', en: '/en/arturo' },
  services: { it: '/servizi', en: '/en/services' },
  work: { it: '/lavori', en: '/en/work' },
  contact: { it: '/contatti', en: '/en/contact' },
  malta: { it: '/malta', en: '/en/malta' },
  privacy: { it: '/privacy', en: '/en/privacy' },
  cookies: { it: '/cookie', en: '/en/cookies' },
  legal: { it: '/note-legali', en: '/en/legal' },
} as const satisfies Record<string, Record<Locale, string>>;

export type PageKey = keyof typeof routes;
export const pageKeys = Object.keys(routes) as PageKey[];

export function href(page: PageKey, locale: Locale): string {
  return routes[page][locale];
}

/** Voci del menu principale, in ordine. */
export const mainNav: readonly PageKey[] = ['arturo', 'services', 'work', 'contact', 'malta'];
export const legalNav: readonly PageKey[] = ['privacy', 'cookies', 'legal'];
