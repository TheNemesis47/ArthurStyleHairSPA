# 08 — Sito vetrina

Stato: `bozza` · App: `apps/web` (Next.js) · Skill: `frontend-design`, `gsap-*`, `r3f-best-practices`, `/webperf`, `web-design-guidelines`

## 1. Obiettivi

1. **Colpire** nei primi 3 secondi: chi arriva da Instagram deve ritrovare lo stesso stile e qualcosa in più.
2. **Convertire:** ogni pagina porta a "Prenota". Obiettivo: ≥ 60 % delle prenotazioni online entro 6 mesi dal lancio ❓ (da concordare).
3. **Farsi trovare:** primi risultati per "parrucchiere Firenze centro", "parrucchiere Sant'Ambrogio", "hair salon Florence", poi le query di Malta.
4. **Restare veloce:** gli effetti non devono costare punti di Core Web Vitals (NFR-02).

## 2. Mappa del sito

| Route (IT / EN) | Contenuto | Note |
|-----------------|-----------|------|
| `/` · `/en` | Hero 3D, manifesto, servizi in evidenza, lavori, recensioni, CTA | |
| `/arturo` · `/en/arturo` | Storia, 20+ anni, filosofia, foto | Storytelling a scroll (timeline pinnata) |
| `/servizi` · `/en/services` | Catalogo dall'API: categorie, prezzi IVA incl., durata indicativa | ISR con revalidate on-demand quando Arturo modifica un servizio (webhook interno) |
| `/lavori` · `/en/work` | Galleria prima/dopo con filtri | Solo foto **con liberatoria** |
| `/prenota` · `/en/book` | Flusso di prenotazione (wizard) | Senza 3D e animazioni pesanti: qui conta la velocità |
| `/prenotazione/[token]` · `/en/booking/[token]` | Gestione: disdici, sposta, .ics | `noindex`, `Referrer-Policy: no-referrer` |
| `/contatti` · `/en/contact` | Indirizzo **19R**, mappa con consenso, orari, telefono, WhatsApp | |
| `/malta` · `/en/malta` | "Coming soon to Malta" + lista d'attesa | Pubblicazione decisa con il cliente ❓ |
| `/privacy`, `/cookie`, `/note-legali`, `/termini-prenotazione` | Pagine legali IT/EN | P.IVA in **footer** di ogni pagina |
| `/account` | Le mie prenotazioni (login con OTP) | `noindex` |

## 3. Direzione creativa (da validare con `idea-refine` e `prototype`)

> Prima i materiali Instagram in `brand/`, poi la direzione. Le proposte qui sotto sono **ipotesi** di partenza.

**Concept proposto: "Il gesto".** 20 anni di mani esperte, raccontati con il movimento.

| Momento | Effetto | Tecnica |
|---------|---------|---------|
| Hero | Ciocche di capelli astratte (migliaia di filamenti) che fluttuano e reagiscono al cursore o al giroscopio; il logo emerge dai fili | R3F: `InstancedMesh` / linee con shader di curl noise, `frameloop="demand"` quando è fermo, DPR limitato a 1,5 |
| Titoli | Apparizione per lettera o riga | GSAP **SplitText** + ScrollTrigger, con `aria-label` sul testo completo |
| "20 anni" | Timeline orizzontale pinnata, con anni e foto storiche | ScrollTrigger `pin` + `scrub` |
| Servizi | Card che si dispongono come strumenti sul banco | GSAP **Flip** al cambio di categoria |
| Lavori | Slider prima/dopo trascinabile | GSAP **Draggable** (+ tastiera: frecce) |
| Transizioni | Passaggio tra pagine con "taglio" (wipe diagonale) | View Transitions API + GSAP, fallback istantaneo |
| Scroll | Scorrimento morbido | **Lenis** sincronizzato con il ticker GSAP; **disattivato** con `prefers-reduced-motion` |
| Micro-interazioni | Cursore magnetico sui CTA (solo puntatore fine) | `gsap.quickTo` |

Alternative da prototipare: forbici o pettine 3D in GLB (Draco/Meshopt + KTX2), oppure un video di Arturo al lavoro
trattato con shader. **La scelta si fa dopo un prototipo provato su un telefono Android di fascia media.**

## 4. Regole di implementazione degli effetti 🔒 (performance e accessibilità)

1. **LCP mai dipendente dal WebGL.** L'elemento LCP è il titolo o un'immagine statica (AVIF/WebP, `priority`). Il canvas si
   monta **dopo** (`requestIdleCallback` / `dynamic(..., { ssr: false })`) e fa fade-in sopra un poster identico.
2. **Rilevamento delle capacità:** niente WebGL2, `navigator.deviceMemory < 4`, `saveData`, batteria scarica o
   `prefers-reduced-motion` → poster statico, nessun canvas.
3. **Il canvas si ferma** quando è fuori viewport (IntersectionObserver), quando la scheda è nascosta e quando la scena è ferma.
4. **Dispose** di geometrie, materiali e texture allo smontaggio (skill `three-best-practices`, sezione *Memory*).
5. **GSAP:** solo `transform`/`opacity`; `useGSAP()` con scope e cleanup automatico; `ScrollTrigger.refresh()` dopo il
   caricamento di font e immagini; `gsap.matchMedia()` per desktop/mobile/reduced-motion.
6. **Nessuna informazione solo nell'animazione:** tutto il contenuto è leggibile con JS disattivato.
7. **Focus e tastiera:** gli elementi animati restano raggiungibili; nessuna trappola di scroll.

### Budget di performance (bloccanti in CI con Lighthouse CI e `size-limit`)

| Metrica | Budget |
|---------|--------|
| LCP (p75, mobile 4G) | < 2,5 s (obiettivo 1,8 s) |
| INP | < 200 ms |
| CLS | < 0,1 |
| JS iniziale (gzip, esclusa la scena 3D) | ≤ 170 KB |
| Chunk 3D (gzip, lazy) | ≤ 450 KB, modelli/texture inclusi |
| Peso pagina home (prima visita) | ≤ 1,5 MB |
| Lighthouse mobile | Performance ≥ 90 · Accessibility 100 · Best Practices 100 · SEO 100 |
| Pagina `/prenota` | JS ≤ 120 KB, TTI < 3 s su mobile medio |

## 5. Flusso di prenotazione (UX)

1. **Servizi:** lista per categoria, multi-selezione, totale aggiornato ("da 65 €", durata ~1 h 50').
2. **Operatore:** "Nessuna preferenza" in evidenza + foto degli operatori.
3. **Data e ora:** calendario a 14 giorni; giorni pieni disattivati, con link "avvisami se si libera" (BOOK-13).
4. **Hold:** al tocco sull'orario parte l'hold, con conto alla rovescia discreto ("Ti teniamo l'orario per 10 minuti").
5. **Dati:** nome, cognome, email/telefono (`autocomplete` corretti, `inputmode`), note. Consenso privacy (informativa) e
   marketing (**separato e non preselezionato**).
6. **Verifica:** OTP se richiesto dalla policy.
7. **Conferma:** riepilogo, "aggiungi al calendario", "scarica l'app", link a WhatsApp del salone.

Ogni passo ha il proprio URL (back del browser funzionante, deep link dalla bio Instagram). Gli errori si mostrano in
linea con `aria-live`. Funziona anche **senza** account. Prima della conferma compare il link ai **termini di
prenotazione** (BOOK-19). Gli orari sono una **lista di pulsanti** raggruppati per mattina e pomeriggio, navigabile da
tastiera e da screen reader, non solo una griglia visuale.

## 5-bis. Lingue

- Nessun redirect automatico in base all'IP o ad `Accept-Language`: danneggia la SEO e chi viaggia. Al primo accesso
  compare un suggerimento discreto ("Switch to English?") e la scelta viene ricordata.
- I testi in inglese li rivede un **madrelingua**, non solo un traduttore automatico: a Malta saranno il primo contatto con il brand.

## 5-ter. Matrice dei dispositivi di test

| Dispositivo | Browser | Perché |
|-------------|---------|--------|
| iPhone recente + iPhone di 4–5 anni fa | Safari | WebGL e scroll su iOS hanno comportamenti propri |
| Android di fascia media (es. ~250 €) | Chrome | È il dispositivo "peggiore realistico" per il budget di performance |
| Desktop | Chrome, Firefox, Safari, Edge (ultime 2 versioni) | — |
| Tablet (iPad) | Safari | Il pannello e i clienti in salone |

## 6. SEO locale

- **Dati strutturati JSON-LD:** `HairSalon` (sottotipo di `LocalBusiness`) con `address` (**"Via Sant'Egidio 19R"**), `geo`,
  `openingHoursSpecification`, `telephone`, `priceRange`, `sameAs` (Instagram, Google), `hasOfferCatalog` con i servizi.
  `BreadcrumbList`, `Person` per Arturo.
- **Metadata** per pagina, `hreflang` it/en + `x-default`, canonical, `sitemap.xml` generata, `robots.txt`
  (`/prenotazione/*`, `/account` esclusi), immagini Open Graph generate.
- **Google Business Profile** (rivendicare o creare, coerenza NAP = Nome/Indirizzo/Telefono identici ovunque), **Apple
  Business Connect**, **Bing Places**. Link "Prenota" del profilo Google → `/prenota?utm_source=google&utm_medium=gbp`.
  Il pulsante integrato "Prenota con Google" (*Reserve with Google*) è riservato a piattaforme partner approvate: per noi
  vale il link al sito.
- **Recensioni:** richiesta automatica dopo l'appuntamento (BOOK-14). È la leva principale della SEO locale, soprattutto per partire forti a Malta.
- **Malta:** quando la sede esiste, una pagina dedicata con il proprio `HairSalon` e il proprio profilo Google. Le
  recensioni non si trasferiscono tra profili: per questo il **sito** e Instagram sono gli asset che "viaggiano".
- **Contenuti:** testi originali (non generati in massa), FAQ vere ("Quanto dura un balayage?"), alt text descrittivi.

## 7. Instagram

- La **Instagram Basic Display API è stata dismessa (dicembre 2024)**. Si usa la **Instagram API con Instagram Login**,
  che richiede un account **Business o Creator**. ⚠️ DA VERIFICARE al momento dell'implementazione: requisiti di app review Meta e permessi.
- Il worker sincronizza ogni ora i post (`instagram_media`), **scarica** i media in locale (gli URL del CDN Meta
  scadono) e li serve ottimizzati. Il token long-lived (60 giorni) si rinnova in automatico, con allarme se il rinnovo fallisce.
- Fallback: se l'API non risponde, il sito mostra l'ultima cache. Mai pagine rotte.
- **Bio Instagram** → `https://www.<dominio>/prenota?utm_source=instagram&utm_medium=bio`. Per i post sponsorizzati, UTM dedicati.
- Embed dei post nativi di Instagram (iframe Meta) **no**: tracciano senza consenso e pesano.

## 8. Analytics e consenso

- **Umami** (self-hosted, senza cookie) per visite e conversioni: `booking_started`, `slot_selected`, `booking_confirmed`, abbandono per passo.
- Nessun pixel Meta/Google Ads senza consenso esplicito. Se in futuro servissero campagne, CMP (banner) conforme alle
  linee guida del Garante e Consent Mode. Vedi [14](14-privacy-e-legale.md).
- **Mappa:** immagine statica (OpenStreetMap/MapLibre) con link "Apri in Google Maps". L'embed di Google Maps si carica solo dopo il consenso.

## 9. Header di sicurezza (via Caddy + Next.js)

`Content-Security-Policy` con nonce per script (niente `unsafe-inline`), `Strict-Transport-Security` (preload dopo un
mese di stabilità), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (camera, microfono e geolocation disattivati; `gyroscope` solo `self` se l'hero lo usa),
`frame-ancestors 'none'`, `Cross-Origin-Opener-Policy: same-origin`. Vedi [12](12-sicurezza.md).
