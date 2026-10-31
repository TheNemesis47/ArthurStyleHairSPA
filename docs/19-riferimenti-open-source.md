# 19 — Riferimenti open source

Stato: `bozza` · Verifica: 31/10/2026

Regola: **riusiamo librerie mature, ci ispiriamo ai prodotti completi, non copiamo codice con licenze incompatibili.**

> 🔒 **Licenze:** il codice GPL-3.0 o AGPL-3.0 incorporato nel nostro progetto imporrebbe gli stessi obblighi al
> nostro codice (l'AGPL anche solo per l'uso via rete). Dai progetti GPL/AGPL prendiamo **idee e modello di dominio**,
> non codice. Ogni dipendenza aggiunta passa un controllo licenze in CI (es. `license-checker` con allowlist: MIT, Apache-2.0, BSD, ISC, MPL-2.0 da valutare).

## 1. Sistemi di prenotazione da studiare

| Progetto | Licenza | Cosa prendiamo (concetti) | Note |
|----------|---------|---------------------------|------|
| [Easy!Appointments](https://github.com/alextselegidis/easyappointments) | GPL-3.0 (PHP) | Servizi, *provider*, **working plan** con pause, **eccezioni** al piano di lavoro, regole di prenotazione, sincronizzazione con Google Calendar | Il modello più vicino a un salone tra i progetti open. Solo ispirazione |
| [Cal.com](https://github.com/calcom/cal.com) | AGPL-3.0 + parti commerciali ⚠️ (fonti 2026 parlano di una chiusura del codice di produzione e di un fork MIT "Cal.diy": DA VERIFICARE) | *Event types*, **availability schedules** con *date overrides*, **buffer** prima/dopo, **minimum notice**, limiti di prenotazione per periodo, gestione dei fusi, UX della scelta dello slot | Il riferimento migliore per l'esperienza utente della prenotazione |
| Openfront Barbershop (openshiporg) | ⚠️ DA VERIFICARE | Prenotazioni + walk-in + gestione negozio per barbieri | Citato da fonti secondarie, repository e licenza non confermati |
| BarberManager (creepymemes/barbermanager) | ⚠️ DA VERIFICARE | Disponibilità per barbiere, promemoria automatici (Django + React) | Riferimento minore |
| LibreBooking | GPL-3.0 (PHP) | Prenotazione di **risorse** generiche con rilevamento dei conflitti | Utile per il modello a risorse e pool |

**Cosa nessuno di questi fa bene, e noi sì:** il **tempo di posa** (operatore libero, postazione occupata) e la
garanzia di mutua esclusione **a livello di database** su tutte le risorse.

## 2. Librerie da riusare (non reinventare)

| Ambito | Libreria | Licenza | Uso |
|--------|----------|---------|-----|
| Calendario pannello | **react-big-calendar** | MIT | Viste giorno/settimana/mese/agenda, `resources` (colonne per operatore), addon drag & drop |
| (alternativa) | FullCalendar | MIT (standard) / commerciale (Premium: viste per risorsa) | Se un giorno servissero timeline avanzate |
| Auth | **Better Auth** | MIT | Sessioni, OTP/magic link, 2FA, passkey, Expo, OAuth provider |
| ORM | **Drizzle ORM** | Apache-2.0 | Query parametrizzate, schema TS |
| Coda job | **pg-boss** | MIT | Job su Postgres |
| Validazione | **zod** | MIT | Confini HTTP/MCP/env |
| Date e fusi | **Temporal** (`temporal-polyfill`) | MIT | Calcoli in ora locale |
| Telefoni | **libphonenumber-js** | MIT | E.164 |
| File calendario | **ics** | ISC | Allegati `.ics` |
| Email | **React Email** | MIT | Template |
| Animazioni | **GSAP** (+ SplitText, ScrollTrigger, Flip, Draggable) | Licenza GSAP "no charge" (gratuita anche per uso commerciale) ⚠️ leggere i termini | Sito |
| Smooth scroll | **Lenis** | MIT | Sito |
| 3D | **three.js**, **@react-three/fiber**, **@react-three/drei** | MIT | Hero |
| UI pannello | **shadcn/ui** (Radix) | MIT | Componenti accessibili |
| Dati client | **TanStack Query / Router** | MIT | Web, admin, mobile |
| i18n | **next-intl** | MIT | Sito |
| MCP | **@modelcontextprotocol/sdk** | MIT | Server MCP |
| Test | Vitest, Playwright, fast-check, Testcontainers, Maestro, k6, Stryker | MIT / Apache-2.0 / AGPL (k6 ⚠️: solo come strumento, non incorporato) | [15](15-qualita-test-ci.md) |
| Analytics | **Umami** | MIT | Senza cookie |
| Reverse proxy | **Caddy** | Apache-2.0 | TLS, header |
| Backup | **pgBackRest** / WAL-G, **restic** | MIT / Apache-2.0 / BSD | [13](13-infrastruttura-vps.md) |
| Sicurezza host | **CrowdSec** | MIT | IPS |

## 3. Altre fonti utili

- PostgreSQL: documentazione su *Range Types* ed *Exclusion Constraints*; articolo di Supabase "Simplifying Time-Based Queries with Range Columns".
- OWASP: ASVS 5.0, Top 10 2025, API Security Top 10 2023, MASVS (mobile), Top 10 per le applicazioni LLM.
- Linee guida App Store Review (4.2, 4.2.6, 4.8, 5.1.1) e Google Play (Data safety, cancellazione account, target API).
- Specifica MCP (autorizzazione, best practice di sicurezza) — da rileggere in fase F6.
- Garante privacy: linee guida cookie (2021). IDPC Malta.
