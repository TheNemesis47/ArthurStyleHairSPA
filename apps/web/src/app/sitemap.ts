import type { MetadataRoute } from 'next';
import { pageKeys, routes } from '../i18n/routes';
import { siteUrl } from '../lib/metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  return pageKeys.flatMap((key) =>
    (['it', 'en'] as const).map((locale) => ({
      url: new URL(routes[key][locale], siteUrl).toString(),
      alternates: {
        languages: {
          it: new URL(routes[key].it, siteUrl).toString(),
          en: new URL(routes[key].en, siteUrl).toString(),
        },
      },
    })),
  );
}
