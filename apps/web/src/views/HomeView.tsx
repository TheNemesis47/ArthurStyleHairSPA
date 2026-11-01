import Image from 'next/image';
import Link from 'next/link';
import { HeroStrands } from '../components/HeroStrands';
import { PriceList } from '../components/PriceList';
import { salon } from '../content/salon';
import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { href } from '../i18n/routes';
import onde from '../assets/lavori/lavoro-castano-onde-01.webp';
import piega from '../assets/lavori/lavoro-castano-piega-02.webp';

export function HomeView({ locale }: { locale: Locale }) {
  const m = t(locale);
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <HeroStrands />
        <div className="wrap">
          <div className="hero-text">
            <p className="eyebrow">{m.home.eyebrow}</p>
            <h1 id="hero-title">{m.home.title}</h1>
            <p className="lead">{m.home.lead}</p>
            <div className="actions">
              <a className="button" href={salon.whatsapp.href} rel="noopener noreferrer" target="_blank">
                {m.cta.whatsapp}
              </a>
              <Link className="text-link" href={href('services', locale)}>
                {m.cta.services}
              </Link>
            </div>
            <p className="small muted" style={{ marginTop: '1.5rem' }}>
              {m.home.reviews(
                locale === 'it' ? salon.google.rating : salon.google.ratingEn,
                salon.google.reviews,
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="services-title">
        <div className="wrap">
          <h2 id="services-title" data-reveal="title">
            {m.home.servicesTitle}
          </h2>
          <p className="muted">{m.home.servicesLead}</p>
          <PriceList locale={locale} only={['taglio-piega', 'colore']} headingLevel={3} />
          <p style={{ marginTop: '2rem' }}>
            <Link className="text-link" href={href('services', locale)}>
              {m.cta.services}
            </Link>
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="work-title">
        <div className="wrap">
          <h2 id="work-title" data-reveal="title">
            {m.home.workTitle}
          </h2>
          <div className="gallery">
            <figure data-reveal="media">
              <Image
                src={onde}
                alt={m.work.photos.onde}
                sizes="(min-width: 72rem) 34rem, (min-width: 40rem) 50vw, 100vw"
                placeholder="blur"
              />
            </figure>
            <figure data-reveal="media">
              <Image
                src={piega}
                alt={m.work.photos.piega}
                sizes="(min-width: 72rem) 34rem, (min-width: 40rem) 50vw, 100vw"
                placeholder="blur"
              />
            </figure>
          </div>
          <p style={{ marginTop: '1.5rem' }}>
            <a className="text-link" href={salon.instagram.href} rel="noopener noreferrer" target="_blank">
              {m.cta.instagram}
            </a>
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="malta-title">
        <div className="wrap">
          <h2 id="malta-title" data-reveal="title">
            {m.home.maltaTitle}
          </h2>
          <p>{m.home.maltaText}</p>
          <Link className="text-link" href={href('malta', locale)}>
            {m.home.maltaLink}
          </Link>
        </div>
      </section>
    </>
  );
}
