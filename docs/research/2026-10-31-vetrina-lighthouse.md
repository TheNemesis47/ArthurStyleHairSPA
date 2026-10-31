# Vetrina F3a — performance e accessibilità

Data: 31/10/2026 · App: `apps/web` (Next.js 16.4, build di produzione, `next start`) · Strumento: Lighthouse 13.6, profilo **mobile**
(Moto G Power emulato, rete e CPU 4× simulate), Chromium preinstallato dell'ambiente.

## Risultato finale (home `/`, 3 esecuzioni)

| Esecuzione | Performance | Accessibilità | Best practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
|------------|-------------|---------------|----------------|-----|-----|-----|-----|-----|-------------|
| 1 | 100 | 100 | 100 | 100 | 0,8 s | 0,8 s | 60 ms | 0 | 1,2 s |
| 2 | 100 | 100 | 100 | 100 | 0,8 s | 0,8 s | 40 ms | 0 | 1,4 s |
| 3 | 100 | 100 | 100 | 100 | 0,8 s | 0,8 s | 40 ms | 0 | 1,3 s |

`/en`: performance 100, accessibilità 100.

## Cosa abbiamo imparato (e corretto)

1. **Prima versione: performance 72, TBT 2,1 s.** Le "ciocche" erano 108 tracciati SVG animati uno per uno con
   `stroke-dashoffset` (non composited: stile e paint a ogni frame), dentro un componente client idratato, con GSAP
   caricato subito. Correzione:
   - SVG reso dal **server** (nessuna idratazione dei tracciati);
   - apertura con un **velo** color carta che scorre via animando solo `transform` (compositor);
   - **GSAP caricato a browser inattivo** (`requestIdleCallback` + `import()`), trasformazioni su contenitori HTML.
   Risultato: TBT 40–60 ms, performance 100.
2. **Bug del tratteggio:** con `vector-effect: non-scaling-stroke` e SVG stirato (`preserveAspectRatio="none"`)
   Chromium calcola `stroke-dasharray` (con `pathLength=1`) nello spazio dello schermo: il disegno si fermava al 63 %
   della linea. Scoperto confrontando gli screenshot con e senza `prefers-reduced-motion`. Superato dal nuovo approccio a velo.
3. **Menu desktop invisibile:** il contenuto di un `<details>` chiuso non si può mostrare via CSS. Ora c'è una lista
   desktop sempre visibile e un menu `<details>` solo su mobile.
4. **`/favicon.ico` 404** (richiesta automatica del browser): aggiunta → best practices 100.

## Verifiche collegate

- Smoke test Playwright: **48/48** (desktop + Pixel 7) — tutte le pagine IT/EN, `lang`, un solo `h1`, hreflang,
  nessun errore in console, navigazione e cambio lingua, menu mobile, form Malta senza invio di dati, `prefers-reduced-motion`, 404, sitemap.
- Unit test del sito: 11/11 (rotte, dizionari, listino ↔ docs/21, formattazione, ciocche deterministiche).
