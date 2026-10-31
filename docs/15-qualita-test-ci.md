# 15 — Qualità, test e CI

Stato: `bozza` · Asticella: [CONSTRAINTS.md](../CONSTRAINTS.md) · Skill: `tdd`, `property-based-testing`, `ci-cd-and-automation`, `webapp-testing`

## 1. Piramide dei test

| Livello | Strumento | Cosa copre | Dove gira |
|---------|-----------|-----------|-----------|
| Statico | TypeScript strict, ESLint (+ regole di sicurezza custom), Prettier, `dependency-cruiser` | Tipi, stile, confini tra moduli, API vietate | Pre-commit + CI |
| Unit | **Vitest** | Funzioni pure di `core` (intervalli, template, policy, prezzi) | CI |
| Proprietà | **fast-check** | Invarianti del motore slot ([06 §8](06-motore-prenotazioni.md)) | CI |
| Integrazione | Vitest + **Testcontainers** (Postgres 18 reale) | Repository, vincoli `EXCLUDE`, trigger, migrazioni, concorrenza | CI |
| Contratto | Schemi zod ↔ OpenAPI; snapshot dell'OpenAPI | Cambi incompatibili dell'API = CI rossa | CI |
| Autorizzazione | Matrice generata: ogni endpoint/tool × ogni ruolo/scope | IDOR, RBAC, scope MCP | CI |
| E2E web | **Playwright** | Prenotazione completa, conflitto 409, disdetta da link, login pannello + MFA, drag & drop | CI (su build) + staging |
| E2E mobile | **Maestro** | Prenota, disdici, elimina account, deep link | CI (emulatore Android) + manuale su iOS |
| Accessibilità | **axe** (Playwright) + `web-design-guidelines` | WCAG 2.2 AA | CI |
| Performance | **Lighthouse CI** + `size-limit` | Budget di [08 §4](08-sito-vetrina.md) | CI |
| Carico | **k6** | 50 utenti concorrenti sulla disponibilità, raffica di hold sullo stesso slot | Staging, prima del lancio |
| Mutazione | **Stryker** | Efficacia dei test del motore (≥ 80 %) | Notturna |
| Sicurezza | CodeQL, Semgrep, gitleaks, OSV-Scanner, Trivy, ZAP, sqlmap | [12](12-sicurezza.md) | CI / staging |
| Restore | Script di restore + controlli | Backup realmente utilizzabili | Mensile su staging |

**Obiettivi di copertura** (rami): `packages/core` ≥ 90 % (booking ≥ 95 %), API ≥ 80 %, UI: si misura sui flussi E2E critici, non con una percentuale.

## 2. Pipeline GitHub Actions

```text
on: pull_request
  ├─ setup (pnpm, cache Turborepo)
  ├─ lint · typecheck · format-check · dependency-cruiser
  ├─ unit + proprietà
  ├─ integrazione (Testcontainers)
  ├─ contratto OpenAPI (diff)
  ├─ build (web, admin, api, mobile export)
  ├─ e2e Playwright + axe + Lighthouse CI
  ├─ sicurezza: CodeQL · Semgrep (regole custom) · gitleaks · OSV-Scanner · pnpm audit
  └─ size-limit

on: push main
  ├─ tutto quanto sopra
  ├─ build immagini Docker → SBOM (Syft) → Trivy → firma (cosign) → GHCR
  ├─ deploy staging → migrate → smoke → E2E staging → ZAP baseline
  └─ (manuale) deploy produzione → smoke → rollback automatico se fallisce

schedule (notte):  Stryker · ZAP active + sqlmap su staging · Renovate · restore test (mensile)
```

Regole 🔒: Actions di terze parti **fissate per SHA**; `permissions:` minimi per job; nessun segreto di produzione
nelle PR da fork; environment `production` con approvazione obbligatoria; se si usano agenti AI dentro le Actions,
audit con `agentic-actions-auditor`.

## 3. Flusso Git

- **Trunk-based**: `main` sempre rilasciabile, branch brevi (≤ 2 giorni), PR piccole (≤ 400 righe di diff utile).
- **Conventional Commits** (`feat(booking): …`, `fix(admin): …`, `security(api): …`) → changelog e versioni automatiche (changesets).
- Branch protection: PR obbligatoria, CI verde, almeno una review (umana o agente con `/code-review` + `/security-review`
  documentati nella PR), nessun push forzato su `main`.
- Template PR: cosa, perché, come è stato testato, rischi, screenshot, checklist di sicurezza.

## 4. Definition of Done (per ogni ticket)

- [ ] Criteri di accettazione del ticket verificati
- [ ] Test scritti **prima** (TDD) o insieme; test di regressione per ogni bug
- [ ] Nessun `any`, nessun `// @ts-ignore` o `eslint-disable` senza motivazione nel codice e ADR se strutturale
- [ ] Nessun test saltato o disattivato (`.skip`, `.only`)
- [ ] Stringhe UI in i18n (IT + EN)
- [ ] Accessibilità verificata (tastiera, contrasto, `aria`)
- [ ] Endpoint o tool nuovi: schema zod, policy di autorizzazione, rate limit, test di autorizzazione, documentazione in [07](07-api.md)/[11](11-mcp-agenti.md)
- [ ] Migrazione DB: expand/contract, testata su una copia dei dati di staging
- [ ] Log e metriche per i nuovi percorsi critici
- [ ] Documentazione aggiornata (doc, ADR, glossario se compaiono nuovi termini)
- [ ] `/code-review` e `/security-review` eseguiti senza finding bloccanti aperti
