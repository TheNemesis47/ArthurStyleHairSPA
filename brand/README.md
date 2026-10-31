# brand/ — Identità visiva Arthur Style · Hair Spa

Stato: `v1` (31/10/2026). Il logo è ricostruito in **vettoriale** partendo da quello in uso su Instagram
(`reference/logo-originale-raster.png`), con lettering e proporzioni misurati sull'originale.

## Logo

| File | Uso |
|------|-----|
| `logo/arthur-style-logo.svg` | **Principale**: script + "HAIR SPA" con filetti, inchiostro taupe, sfondo trasparente |
| `logo/arthur-style-logo-negativo.svg` | Su fondi scuri (crema `#FBF8F1`) |
| `logo/arthur-style-logo-sfondo.svg` | Versione "biglietto": fondo crema + motivo a ciocche, come l'originale |
| `logo/arthur-style-wordmark.svg` | Solo "Arthur Style" (header del sito, firme) |
| `logo/arthur-style-monogramma.svg` | "AS" in un cerchio sottile (timbri, packaging, avatar) |
| `logo/favicon.svg` | Favicon (A, tratto rinforzato per la leggibilità a 16–32 px) |
| `logo/app-icon.svg` | Icona dell'app (senza angoli: la maschera la applicano iOS e Android; A nell'area sicura) |
| `logo/social-1200x630.svg`, `logo/social-1080x1080.svg` | Anteprima link (Open Graph) e post Instagram |
| `logo/png/` | Esportazioni: `app-icon-1024`, `apple-touch-icon-180`, `icon-192`, `icon-512`, `favicon-32`, `og-image-1200x630`, `instagram-1080`, `arthur-style-logo-2000` |

- Tutto il testo è **convertito in tracciati**: i file non dipendono da font installati.
- Lettering: **Pinyon Script** (SIL OFL 1.1) con tratto ingrossato di 2,2/150 em, come nell'originale.
  "HAIR SPA": **Jost** (SIL OFL 1.1), peso 360, spaziatura calcolata sull'originale.
- **Area di rispetto:** almeno l'altezza della "t" minuscola su ogni lato. **Dimensione minima:** 120 px di larghezza (sotto si usa il monogramma o la favicon).
- **Non** deformare, ruotare, cambiare font, aggiungere ombre o contorni.
- ⚠️ Marchio: un logo basato su un font libero si può usare liberamente, ma è meno "distintivo" ai fini di una
  registrazione. Se in futuro si registra il marchio (Q31), valutare con il consulente un lettering ritoccato a mano.

### Rigenerare o creare varianti (es. "HAIR SPA · MALTA")

```bash
pip install fonttools uharfbuzz
```

```bash
python3 brand/tools/build_brand.py /tmp/brand-out
```

Per i PNG: `node brand/tools/export.js '<jobs JSON>'` (usa Chromium/Playwright). Dettagli nei commenti degli script.

## Palette

Vedi [`palette.md`](palette.md) (con i contrasti WCAG) e [`tokens.json`](tokens.json) (design token per sito, pannello e app).

## Tipografia

| Ruolo | Font | Note |
|-------|------|------|
| Logo e momenti "firma" | Pinyon Script | **Solo** logo e rari tocchi (es. la firma "Arturo"). Mai per titoli lunghi o testo |
| Titoli, testo, interfaccia | **Jost** (variabile 300–600) | Una sola famiglia per tutto. Titoli grandi in peso 300–350, in tondo e non in maiuscolo; testo a 400 |

File in `fonts/` con le licenze OFL. Sul sito vanno serviti **self-hosted** in WOFF2 (niente CDN Google: vedi docs/14).

## Motivo grafico: le ciocche

Le linee sottili dello sfondo del logo sono il segno distintivo del brand: **ciocche di capelli**. Ricorrono come
separatori di sezione, come sfondo delle immagini social e, in movimento, nell'hero 3D del sito (vedi docs/08 §3).
Si usano sempre sottili (≤ 0,6 px a 1×), a bassa opacità, mai come texture piena.

## Foto

| File | Contenuto | Note |
|------|-----------|------|
| `photos/lavoro-castano-onde-01.webp` | Castano con onde morbide, salone sullo sfondo | Provvisoria (non professionale). Nessun metadato EXIF/GPS |
| `photos/lavoro-castano-piega-02.webp` | Piega castano, cliente di spalle con prodotti | Provvisoria. Nessun metadato EXIF/GPS |

Le clienti sono riprese di spalle o di profilo. Per l'uso sul sito serve comunque la **liberatoria** (docs/14 §8).
Le foto professionali le aggiungiamo quando ci sono.

## Riferimenti

- `reference/logo-originale-raster.png`: logo originale fornito (raster).
- `reference/google-business-profile-2026-10-31.png`: scheda Google al 31/10/2026 (4,7★ su 140 recensioni, Treatwell 4,5★ su 8). **Attenzione:** indirizzo diverso da quello fornito (vedi docs/17, Q44).

> Non inserire in questa cartella dati personali dei clienti o documenti con dati sensibili.
