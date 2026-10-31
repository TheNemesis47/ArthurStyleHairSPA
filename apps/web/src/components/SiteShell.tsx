import type { ReactNode } from 'react';
import type { Locale } from '../i18n/locales';
import type { PageKey } from '../i18n/routes';
import { Footer } from './Footer';
import { Header } from './Header';

export function SiteShell({
  locale,
  page,
  children,
}: {
  locale: Locale;
  page: PageKey;
  children: ReactNode;
}) {
  return (
    <>
      <Header locale={locale} page={page} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer locale={locale} />
    </>
  );
}
