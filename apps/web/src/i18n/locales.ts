export const locales = ['it', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'it';

/** Tag BCP 47 per Intl (prezzi, durate) e per l'attributo lang. */
export const intlLocale: Record<Locale, string> = { it: 'it-IT', en: 'en-GB' };
