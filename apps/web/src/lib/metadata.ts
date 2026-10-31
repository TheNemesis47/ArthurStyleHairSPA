import type { Metadata } from 'next';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { routes, type PageKey } from '../i18n/routes';

/** Dominio definitivo da scegliere (Q22): finché manca, si usa la variabile d'ambiente o localhost. */
export const siteUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3100';

export function pageMetadata(locale: Locale, page: PageKey): Metadata {
  const m = t(locale).meta;
  const own = m[page];
  const title = page === 'home' ? own.title : `${own.title} · ${m.siteName}`;
  return {
    metadataBase: new URL(siteUrl),
    title,
    description: own.description,
    alternates: {
      canonical: routes[page][locale],
      languages: { it: routes[page].it, en: routes[page].en, 'x-default': routes[page].it },
    },
    openGraph: {
      type: 'website',
      siteName: m.siteName,
      title,
      description: own.description,
      locale: locale === 'it' ? 'it_IT' : 'en_GB',
      url: routes[page][locale],
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Arthur Style — Hair Spa' }],
    },
    icons: { apple: '/apple-touch-icon.png' },
  };
}
