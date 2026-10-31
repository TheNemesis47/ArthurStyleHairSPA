import { salon } from '../content/salon';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { PageHeader } from './PageHeader';

export function ContactView({ locale }: { locale: Locale }) {
  const m = t(locale);
  const c = m.contact;
  return (
    <PageHeader title={c.title} lead={c.lead}>
      <div className="actions">
        <a className="button" href={salon.whatsapp.href} rel="noopener noreferrer" target="_blank">
          {m.cta.whatsapp}
        </a>
        <a className="text-link" href={salon.phone.href}>
          {m.cta.call}
        </a>
      </div>
      <dl className="facts">
        <div>
          <dt>{c.phone}</dt>
          <dd>
            <a href={salon.phone.href}>{salon.phone.display}</a>
          </dd>
        </div>
        <div>
          <dt>{c.whatsapp}</dt>
          <dd>
            <a href={salon.whatsapp.href} rel="noopener noreferrer" target="_blank">
              {salon.whatsapp.display}
            </a>
          </dd>
        </div>
        <div>
          <dt>{c.instagram}</dt>
          <dd>
            <a href={salon.instagram.href} rel="noopener noreferrer" target="_blank">
              {salon.instagram.handle}
            </a>
          </dd>
        </div>
        <div>
          <dt>{c.address}</dt>
          <dd>
            {salon.address.street}, {salon.address.city}
            {salon.address.confirmed ? null : <span className="small muted"> ({c.addressPending})</span>}
            <br />
            <a className="small" href={salon.mapsHref} rel="noopener noreferrer" target="_blank">
              {m.cta.maps}
            </a>
          </dd>
        </div>
        <div>
          <dt>{c.hours}</dt>
          <dd>
            <table className="hours">
              <tbody>
                {salon.hours.map((h) => (
                  <tr key={h.weekday}>
                    <th scope="row">{c.days[h.weekday - 1]}</th>
                    <td>{h.open === null ? c.closed : `${h.open}–${h.close}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </dd>
        </div>
      </dl>
    </PageHeader>
  );
}
