/**
 * Dati del salone (docs/01). Fonte: risposte del cliente del 31/10/2026 e scheda Google.
 * ⚠️ Indirizzo da confermare (docs/17 Q44): Google riporta "Via Sant'Egidio 5, 50121", il cliente "Via Sant'Egidio 19".
 * Finché non è confermato, il sito mostra solo la via, senza civico.
 */
export const salon = {
  name: 'Arthur Style',
  tagline: 'Hair Spa',
  phone: { display: '+39 353 491 8255', href: 'tel:+393534918255' },
  whatsapp: { display: '+39 331 754 5064', href: 'https://wa.me/393317545064' },
  instagram: { handle: '@arthurstylehairspa', href: 'https://www.instagram.com/arthurstylehairspa/' },
  address: { street: "Via Sant'Egidio", city: 'Firenze', confirmed: false as boolean },
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Arthur+Style+Hair+Firenze',
  google: { rating: '4,7', ratingEn: '4.7', reviews: 140 },
  /** Orari mock (docs/21): mar–ven 9–19, sab 9–18. weekday ISO: 1 = lunedì. */
  hours: [
    { weekday: 1, open: null, close: null },
    { weekday: 2, open: '09:00', close: '19:00' },
    { weekday: 3, open: '09:00', close: '19:00' },
    { weekday: 4, open: '09:00', close: '19:00' },
    { weekday: 5, open: '09:00', close: '19:00' },
    { weekday: 6, open: '09:00', close: '18:00' },
    { weekday: 7, open: null, close: null },
  ],
} as const;
