import { PriceList } from '../components/PriceList';
import { ServiceFilter } from '../components/ServiceFilter';
import { categories, services, type CategoryKey } from '../content/listino';
import { salon } from '../content/salon';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { PageHeader } from './PageHeader';

export function ServicesView({ locale }: { locale: Locale }) {
  const m = t(locale);
  const count = (key: CategoryKey) => services.filter((s) => s.category === key).length;
  const status = Object.fromEntries([
    ['all', m.services.filterStatus(services.length, m.services.filterAll)],
    ...categories.map((c) => [c.key, m.services.filterStatus(count(c.key), c[locale])]),
  ]) as Record<CategoryKey | 'all', string>;
  return (
    <PageHeader title={m.services.title} lead={m.services.lead}>
      <p className="small muted">{m.services.mockNote}</p>
      <ServiceFilter
        options={categories.map((c) => ({ key: c.key, label: c[locale] }))}
        allLabel={m.services.filterAll}
        groupLabel={m.services.filterLabel}
        status={status}
      >
        <PriceList locale={locale} />
      </ServiceFilter>
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
