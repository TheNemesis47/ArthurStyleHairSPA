import { ViewTransition, type ReactNode } from 'react';
import type { Locale } from '../i18n/locales';
import type { PageKey } from '../i18n/routes';
import { Footer } from './Footer';
import { Header } from './Header';
import { MotionLayer } from './MotionLayer';

/**
 * Struttura comune delle pagine. Sta in ogni `page.tsx` (non nel layout), quindi al cambio pagina il contenuto esce ed
 * entra: `ViewTransition` lo anima con il "taglio" diagonale definito in globals.css (docs/08 §3). Header e footer restano
 * fermi. Senza supporto del browser, o con `prefers-reduced-motion`, la pagina cambia subito.
 */
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
        <ViewTransition enter="page-cut" exit="page-fade" default="none">
          <div>{children}</div>
        </ViewTransition>
      </main>
      <Footer locale={locale} />
      <MotionLayer />
    </>
  );
}
