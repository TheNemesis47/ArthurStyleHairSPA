import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { PageHeader } from './PageHeader';

export function ArturoView({ locale }: { locale: Locale }) {
  const m = t(locale).arturo;
  return (
    <PageHeader title={m.title} lead={m.lead}>
      {m.body.map((p) => (
        <p key={p.slice(0, 24)}>{p}</p>
      ))}
      <img className="signature" src="/brand/firma-arturo.svg" alt={m.signatureAlt} width={309} height={86} />
      <p className="small muted" style={{ marginTop: '2rem' }}>
        {m.note}
      </p>
    </PageHeader>
  );
}
