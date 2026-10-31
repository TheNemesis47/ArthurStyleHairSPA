import { categories, services, type CategoryKey } from '../content/listino';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { formatDuration, formatPrice } from '../lib/format';

export function PriceList({
  locale,
  only,
  headingLevel = 2,
}: {
  locale: Locale;
  only?: readonly CategoryKey[];
  headingLevel?: 2 | 3;
}) {
  const m = t(locale);
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const groups = categories.filter((c) => only === undefined || only.includes(c.key));
  return (
    <div className="price-groups">
      {groups.map((c) => (
        <section key={c.key} className="price-group" aria-labelledby={`cat-${c.key}`}>
          <Heading id={`cat-${c.key}`}>{c[locale]}</Heading>
          <ul className="price-list">
            {services
              .filter((s) => s.category === c.key)
              .map((s) => (
                <li key={s.slug} className="price-row">
                  <span className="name">{s.name[locale]}</span>
                  <span className="dur">
                    <span className="visually-hidden">{m.services.duration}: </span>
                    {formatDuration(s.durationMin)}
                  </span>
                  <span className="price">
                    <span className="visually-hidden">{m.services.price}: </span>
                    {s.onlineBookable
                      ? formatPrice(s.priceCents, s.priceIsFrom, locale)
                      : m.services.onRequest}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
