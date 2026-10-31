# AGENTS.md — Istruzioni per gli agenti di coding

Questo file vale per **qualsiasi** agente (Claude Code, Codex, Cursor, Copilot…). Claude Code lo importa da `CLAUDE.md`.

## Progetto

Piattaforma digitale di **Arthur Style** (salone di parrucchiere a Firenze, in futuro a Malta): sito vetrina con
GSAP/Three.js, prenotazione online con mutua esclusione garantita dal database, pannello di gestione, app iOS/Android
(Expo), API unica, server MCP per agenti. Contesto completo: [README.md](README.md) e [docs/](docs/README.md).

**Stato:** progettazione. Prima di scrivere codice si leggono [CONSTRAINTS.md](CONSTRAINTS.md), il documento della fase
corrente in [docs/16-roadmap.md](docs/16-roadmap.md) e gli ADR in [docs/adr/](docs/adr/README.md).

## Struttura (prevista, vedi [docs/04](docs/04-architettura.md) §3)

`apps/{web,admin,api,worker,mcp,mobile}` · `packages/{core,db,contracts,i18n,notifications,ui,config,testing}` · `infra/` · `docs/` · `brand/`

## Comandi

> Da compilare durante lo scaffolding (F0.6). Valori previsti:

```bash
pnpm install          # rispetta minimumReleaseAge e allowlist dei build script
pnpm dev              # tutte le app in sviluppo (Turborepo)
pnpm lint             # ESLint + regole di sicurezza custom
pnpm typecheck
pnpm test             # unit + proprietà
pnpm test:integration # richiede Docker (Testcontainers, Postgres 18)
pnpm test:e2e         # Playwright
pnpm db:migrate       # migrazioni (ruolo app_owner)
```

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
