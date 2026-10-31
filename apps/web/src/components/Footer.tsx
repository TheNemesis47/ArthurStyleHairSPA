import Link from 'next/link';
import { salon } from '../content/salon';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { href, legalNav } from '../i18n/routes';

export function Footer({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div>
          <img
            src="/brand/arthur-style-logo-negativo.svg"
            alt="Arthur Style — Hair Spa"
            width={757}
            height={292}
          />
        </div>
        <div>
          <p>
            {salon.address.street}, {salon.address.city}
          </p>
          <p>{m.footer.hours}</p>
          <p>
            <a href={salon.phone.href}>{salon.phone.display}</a>
          </p>
          <p>
            <a href={salon.whatsapp.href} rel="noopener noreferrer" target="_blank">
              WhatsApp {salon.whatsapp.display}
            </a>
          </p>
          <p>
            <a href={salon.instagram.href} rel="noopener noreferrer" target="_blank">
              Instagram {salon.instagram.handle}
            </a>
          </p>
        </div>
        <nav aria-label={m.a11y.footerNav}>
          <ul>
            {legalNav.map((key) => (
              <li key={key}>
                <Link href={href(key, locale)}>{m.nav[key]}</Link>
              </li>
            ))}
          </ul>
          <p className="small" style={{ marginTop: '1rem' }}>
            {m.footer.rights} · {m.legal.vat}
          </p>
        </nav>
      </div>
    </footer>
  );
}
