import type { Metadata } from 'next';
import Link from 'next/link';
import { jost } from '../lib/fonts';
import { it } from '../i18n/messages/it';
import { en } from '../i18n/messages/en';
import '../styles/globals.css';

export const metadata: Metadata = { title: 'Pagina non trovata · Page not found', robots: { index: false } };

/** 404 globale bilingue: con un layout radice per lingua serve global-not-found (docs Next 16). */
export default function GlobalNotFound() {
  return (
    <html lang="it" className={jost.variable}>
      <body>
        <main id="main" className="section">
          <div className="wrap">
            <img
              src="/brand/arthur-style-logo.svg"
              alt="Arthur Style — Hair Spa"
              width={757}
              height={292}
              style={{ width: '12rem', marginBottom: '2.5rem' }}
            />
            <h1>{it.notFound.title}</h1>
            <p>{it.notFound.text}</p>
            <p>
              <Link href="/">{it.notFound.back}</Link>
            </p>
            <h2 lang="en" style={{ marginTop: '3rem' }}>
              {en.notFound.title}
            </h2>
            <p lang="en">{en.notFound.text}</p>
            <p lang="en">
              <Link href="/en">{en.notFound.back}</Link>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
