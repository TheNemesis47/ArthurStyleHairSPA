import { intlLocale, type Locale } from '../i18n/locales';

/** Prezzo da centesimi, IVA inclusa. 0 = gratuito; priceIsFrom = "da …" / "from …". */
export function formatPrice(cents: number, priceIsFrom: boolean, locale: Locale): string {
  if (cents === 0) return locale === 'it' ? 'Gratuita' : 'Free';
  const amount = new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
  if (!priceIsFrom) return amount;
  return locale === 'it' ? `da ${amount}` : `from ${amount}`;
}

/** Durata leggibile: "40 min", "1 h 45 min", "2 h". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${String(m)} min`;
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m)} min`;
}
