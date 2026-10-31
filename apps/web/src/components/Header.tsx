import Link from 'next/link';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { href, mainNav, routes, type PageKey } from '../i18n/routes';

function NavItems({
  className,
  locale,
  page,
  other,
}: {
  className: string;
  locale: Locale;
  page: PageKey;
  other: Locale;
}) {
  const m = t(locale);
  return (
    <ul className={className}>
      {mainNav.map((key) => (
        <li key={key}>
          <Link href={href(key, locale)} aria-current={key === page ? 'page' : undefined}>
            {m.nav[key]}
          </Link>
        </li>
      ))}
      <li>
        <a className="lang-switch" href={routes[page][other]} hrefLang={other} lang={other}>
          {m.a11y.switchTo}
        </a>
      </li>
    </ul>
  );
}

export function Header({ locale, page }: { locale: Locale; page: PageKey }) {
  const m = t(locale);
  const other: Locale = locale === 'it' ? 'en' : 'it';
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href={href('home', locale)} className="brand-link" aria-label={m.meta.siteName}>
          {/* SVG del logo: dimensioni esplicite per evitare spostamenti di layout */}
          <img src="/brand/arthur-style-logo.svg" alt="" width={757} height={292} />
        </Link>
        <nav aria-label={m.a11y.mainNav}>
          {/* Desktop: lista sempre visibile. Mobile: menu a scomparsa senza JS. Una sola delle due è visibile (CSS). */}
          <NavItems className="nav-list nav-desktop" locale={locale} page={page} other={other} />
          <details className="menu nav-mobile">
            <summary>{m.a11y.menu}</summary>
            <NavItems className="nav-list" locale={locale} page={page} other={other} />
          </details>
        </nav>
      </div>
    </header>
  );
}
