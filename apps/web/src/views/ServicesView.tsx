import { PriceList } from '../components/PriceList';
import { salon } from '../content/salon';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { PageHeader } from './PageHeader';

export function ServicesView({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    <PageHeader title={m.services.title} lead={m.services.lead}>
      <p className="small muted">{m.services.mockNote}</p>
      <PriceList locale={locale} />
      <div className="actions">
        <a className="button" href={salon.whatsapp.href} rel="noopener noreferrer" target="_blank">
          {m.cta.whatsapp}
        </a>
      </div>
      <p className="small muted" style={{ marginTop: '1rem' }}>
        {m.cta.bookSoon}
      </p>
    </PageHeader>
  );
}
