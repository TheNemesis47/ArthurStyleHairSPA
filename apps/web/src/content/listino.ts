/**
 * Listino MOCK (docs/21 §Listino mock): prezzi e durate di prova, da sostituire con quelli reali (Q09).
 * Un test verifica che coincida con il blocco YAML di docs/21: la fonte resta il documento.
 */
export interface Service {
  readonly slug: string;
  readonly category: CategoryKey;
  readonly name: { readonly it: string; readonly en: string };
  /** Centesimi, IVA inclusa. */
  readonly priceCents: number;
  readonly priceIsFrom: boolean;
  /** Durata per il cliente (somma delle fasi, buffer esclusi). */
  readonly durationMin: number;
  readonly onlineBookable: boolean;
}

export type CategoryKey = 'taglio-piega' | 'colore' | 'hair-spa' | 'acconciature' | 'consulenza';

export const categories: readonly { key: CategoryKey; it: string; en: string }[] = [
  { key: 'taglio-piega', it: 'Taglio e piega', en: 'Cut & blow-dry' },
  { key: 'colore', it: 'Colore', en: 'Colour' },
  { key: 'hair-spa', it: 'Hair Spa', en: 'Hair Spa' },
  { key: 'acconciature', it: 'Acconciature', en: 'Styling' },
  { key: 'consulenza', it: 'Consulenza', en: 'Consultation' },
];

const s = (
  slug: string,
  category: CategoryKey,
  it: string,
  en: string,
  priceCents: number,
  priceIsFrom: boolean,
  durationMin: number,
  onlineBookable = true,
): Service => ({ slug, category, name: { it, en }, priceCents, priceIsFrom, durationMin, onlineBookable });

export const services: readonly Service[] = [
  s('piega-corti', 'taglio-piega', 'Piega capelli corti', 'Blow-dry, short hair', 2500, false, 40),
  s(
    'piega-lunghi',
    'taglio-piega',
    'Piega capelli medi/lunghi',
    'Blow-dry, medium/long hair',
    3200,
    true,
    50,
  ),
  s('taglio-piega', 'taglio-piega', 'Taglio + piega', 'Cut & blow-dry', 5500, true, 65),
  s('taglio-uomo', 'taglio-piega', 'Taglio uomo', "Men's cut", 2500, false, 35),
  s('colore-radici', 'colore', 'Colore radici + piega', 'Root colour & blow-dry', 6500, true, 105),
  s('colore-completo', 'colore', 'Colore completo + piega', 'Full colour & blow-dry', 8000, true, 120),
  s(
    'balayage',
    'colore',
    'Balayage / schiariture + piega',
    'Balayage / highlights & blow-dry',
    14000,
    true,
    160,
  ),
  s('gloss', 'colore', 'Gloss tonalizzante', 'Toning gloss', 3500, false, 40),
  s('ristrutturante', 'hair-spa', 'Trattamento ristrutturante', 'Repair treatment', 3000, false, 40),
  s('rituale-hair-spa', 'hair-spa', 'Rituale Hair Spa', 'Hair Spa ritual', 6000, false, 85),
  s('cheratina', 'hair-spa', 'Lisciante alla cheratina', 'Keratin smoothing', 18000, true, 150, false),
  s('acconciatura', 'acconciature', 'Acconciatura evento', 'Event styling', 7000, true, 60),
  s('consulenza-colore', 'consulenza', 'Consulenza colore', 'Colour consultation', 0, false, 15),
];
