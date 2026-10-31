import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { jost } from '../../lib/fonts';
import { t } from '../../i18n';
import '../../styles/globals.css';

export const viewport: Viewport = { themeColor: '#fbf8f1' };

/** Layout radice italiano: un layout per lingua, così <html lang> è corretto (docs/08). */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={jost.variable}>
      <body>
        <a className="skip" href="#main">
          {t('it').a11y.skip}
        </a>
        {children}
      </body>
    </html>
  );
}
