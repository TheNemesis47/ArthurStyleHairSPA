import { WaitlistForm } from '../components/WaitlistForm';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { PageHeader } from './PageHeader';

export function MaltaView({ locale }: { locale: Locale }) {
  const m = t(locale).malta;
  return (
    <PageHeader title={m.title} lead={m.lead}>
      <WaitlistForm m={m} />
    </PageHeader>
  );
}
