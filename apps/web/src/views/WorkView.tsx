import Image from 'next/image';
import { salon } from '../content/salon';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import onde from '../assets/lavori/lavoro-castano-onde-01.webp';
import piega from '../assets/lavori/lavoro-castano-piega-02.webp';
import { PageHeader } from './PageHeader';

export function WorkView({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    <PageHeader title={m.work.title} lead={m.work.lead}>
      <div className="gallery">
        <figure>
          <Image
            src={onde}
            alt={m.work.photos.onde}
            sizes="(min-width: 72rem) 34rem, (min-width: 40rem) 50vw, 100vw"
            placeholder="blur"
            priority
          />
          <figcaption>{m.work.photos.onde}</figcaption>
        </figure>
        <figure>
          <Image
            src={piega}
            alt={m.work.photos.piega}
            sizes="(min-width: 72rem) 34rem, (min-width: 40rem) 50vw, 100vw"
            placeholder="blur"
          />
          <figcaption>{m.work.photos.piega}</figcaption>
        </figure>
      </div>
      <p style={{ marginTop: '2rem' }}>
        <a className="text-link" href={salon.instagram.href} rel="noopener noreferrer" target="_blank">
          {m.cta.instagram}
        </a>
      </p>
    </PageHeader>
  );
}
