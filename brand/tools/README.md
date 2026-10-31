# brand/tools — Generatore del logo

- `text2path.py`: testo → tracciato SVG con shaping HarfBuzz (legature, kerning, alternative contestuali degli script).
- `build_brand.py`: genera tutti gli SVG di `brand/logo/` usando i font in `brand/fonts/`. Le misure (bbox dello
  script, posizione di "HAIR SPA" e dei filetti) sono quelle rilevate sull'originale 910×589.
- `export.js`: esporta i PNG con Chromium (Playwright). Riceve un JSON `[[svg, png, larghezza, altezza, sfondo|null], …]`.

L'output di `build_brand.py` è deterministico: rigenerando si ottengono file identici a quelli committati (verificato il 31/10/2026).
