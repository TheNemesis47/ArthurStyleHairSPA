# AGENTS.md — Istruzioni per gli agenti di coding

Questo file vale per **qualsiasi** agente (Claude Code, Codex, Cursor, Copilot…). Claude Code lo importa da `CLAUDE.md`.

## Progetto

Piattaforma digitale di **Arthur Style** (salone di parrucchiere a Firenze, in futuro a Malta): sito vetrina con
GSAP/Three.js, prenotazione online con mutua esclusione garantita dal database, pannello di gestione, app iOS/Android
(Expo), API unica, server MCP per agenti. Contesto completo: [README.md](README.md) e [docs/](docs/README.md).

**Stato:** sviluppo iniziato (F0 + F1). Esistono `packages/core` (motore di disponibilità), `packages/db` (migrazioni,
lock, hold, letture del catalogo, seed), `packages/contracts` (schemi zod + OpenAPI) e `apps/api` (Fastify, endpoint pubblici). Prima di scrivere codice si leggono [CONSTRAINTS.md](CONSTRAINTS.md), il documento della fase
corrente in [docs/16-roadmap.md](docs/16-roadmap.md) e gli ADR in [docs/adr/](docs/adr/README.md).

## Struttura (prevista, vedi [docs/04](docs/04-architettura.md) §3)

`apps/{web,admin,api,worker,mcp,mobile}` · `packages/{core,db,contracts,i18n,notifications,ui,config,testing}` · `infra/` · `docs/` · `brand/`

Oggi esistono: `apps/web` (vetrina IT/EN), `apps/api`, `packages/core`, `packages/db`, `packages/contracts`, `.github/workflows/` (CI, CodeQL), `brand/`, `docs/`.

## Comandi

Requisiti: Node ≥ 22.12 (CI e produzione: 24, vedi `.nvmrc`), pnpm 10.28 (`packageManager`).

```bash
pnpm install                 # rispetta minimumReleaseAge (3 giorni) e l'allowlist dei build script
pnpm lint                    # ESLint + regole di sicurezza (sql.raw, dangerouslySetInnerHTML, Date nel dominio, .only/.skip)
pnpm typecheck               # tsc strict su tutti i pacchetti
pnpm test                    # unit + proprietà (+ copertura con soglia 95% sul motore)
pnpm format:check            # Prettier
DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres pnpm test:integration
                             # PostgreSQL di TEST (crea e distrugge un DB usa e getta; mai produzione)
DATABASE_URL=… pnpm --filter @arthur/db db:migrate   # migrazioni (ruolo app_owner)
DATABASE_URL=… pnpm --filter @arthur/db db:seed:mock # dati di prova di docs/21 (solo sviluppo/staging)
```

```bash
DATABASE_URL=… ORGANIZATION_SLUG=arthur-style HOLD_COOKIE_SECRET=… OTP_SECRET=… \
  TURNSTILE_SECRET=1x0000000000000000000000000000000AA MAIL_TRANSPORT=dev-file \
  pnpm --filter @arthur/api start   # API su :3200 (config: apps/api/src/config.ts; email di sviluppo in .dev-mail/)
pnpm --filter @arthur/api openapi   # rigenera packages/contracts/openapi.json (un test fallisce se non è aggiornato)
```

```bash
pnpm build                   # build di tutte le app (oggi: vetrina Next.js)
pnpm --filter @arthur/web dev        # vetrina in sviluppo
pnpm --filter @arthur/web start      # vetrina di produzione su :3100 (dopo pnpm build)
pnpm test:e2e                # smoke test Playwright IT/EN (richiede la build; usa il server su :3100 se già avviato)
```

Nota Next.js 16: le API differiscono dalla memoria dei modelli. Leggi `apps/web/node_modules/next/dist/docs/` prima di scrivere codice Next.

## Regole non negoziabili 🔒

1. **Mai** query SQL costruite con concatenazione o `sql.raw()` con input esterno. Solo query builder Drizzle o tag `sql\`` parametrizzato. Identificatori dinamici solo da mappe in allowlist.
2. **Mai** fidarsi del client per prezzi, durate, slot o permessi: il server ricalcola e verifica sempre.
3. **Ogni** endpoint o tool MCP ha: schema zod, policy di autorizzazione (anche a livello di oggetto), rate limit, test di autorizzazione.
4. **Mai** aggirare o disattivare i vincoli `EXCLUDE` del DB. Se un test fallisce per un conflitto, il bug è nel chiamante.
5. **Mai** segreti nel codice, nei log, nei test o nei messaggi di commit. Mai PII nei log.
6. **Mai** disattivare, saltare o indebolire test, lint o controlli di sicurezza per far passare la CI. Se un check va cambiato: ADR.
7. Il tempo nel dominio passa dalla porta `Clock`; i fusi orari dalla sede (`location.timezone`). Mai `new Date()` nella logica di dominio.
8. Il denaro è in **centesimi interi** + valuta.
9. Tutte le stringhe UI sono in i18n (IT + EN).
10. Nessun tool MCP generico (SQL, shell, HTTP, messaggi liberi). Le scritture MCP sono **sempre** in due fasi.

## Convenzioni

- Codice, identificatori e commit in **inglese**; documentazione in **italiano**; termini tradotti con il [glossario](docs/glossario.md).
- TypeScript `strict`, niente `any` (si usa `unknown` + parse con zod).
- Conventional Commits (`feat(booking): …`). PR piccole, trunk-based.
- Moduli profondi con interfacce piccole (`packages/core` senza dipendenze da framework o I/O).
- Errori API in RFC 9457. Date ISO 8601 con offset.

## Come lavorare (workflow con le skill)

Dettaglio in [docs/03-skill-e-workflow-agenti.md](docs/03-skill-e-workflow-agenti.md). In breve:

1. Chiarire (`grill-with-docs`) → 2. Spec (`/spec`, in `docs/specs/`) → 3. Piano (`/plan`) e ticket (`to-tickets`) →
4. **TDD** a slice verticali (`tdd`) → 5. Verifica (test, `/webperf`, a11y) → 6. `/security-review` + `/code-review` → 7. PR → 8. `/ship`.

Se due skill si sovrappongono (es. TDD di Addy Osmani e di Matt Pocock), usa quella indicata nella matrice del doc 03.

## Definition of Done

[docs/15-qualita-test-ci.md §4](docs/15-qualita-test-ci.md). In sintesi: test verdi (scritti prima), nessun check
disattivato, i18n, accessibilità, autorizzazione testata, documentazione e glossario aggiornati, review di sicurezza senza finding bloccanti.

## Cose da NON fare

- Non aggiungere dipendenze senza motivarlo nella PR (licenza compatibile: niente GPL/AGPL incorporato, vedi [docs/19](docs/19-riferimenti-open-source.md)).
- Non collegare strumenti di sviluppo (MCP Postgres, Playwright…) a produzione.
- Non lanciare scansioni attive (sqlmap, ZAP active) fuori da staging.
- Non inventare informazioni sul cliente: se manca qualcosa, aggiungi la domanda a [docs/17](docs/17-domande-aperte.md).
