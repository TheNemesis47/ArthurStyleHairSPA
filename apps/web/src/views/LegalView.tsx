import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import type { PageKey } from '../i18n/routes';
import { PageHeader } from './PageHeader';

/** Pagine legali segnaposto (docs/14): testi definitivi dopo la revisione del consulente; P.IVA in arrivo (Q02b). */
export function LegalView({
  locale,
  page,
}: {
  locale: Locale;
  page: Extract<PageKey, 'privacy' | 'cookies' | 'legal'>;
}) {
  const m = t(locale);
  return (
    <PageHeader title={m.meta[page].title}>
      <p className="notice">{m.legal.pending}</p>
      {page === 'legal' ? (
        <p style={{ marginTop: '1.5rem' }}>
          {m.footer.rights} · {m.legal.vat}
        </p>
      ) : null}
    </PageHeader>
  );
}
