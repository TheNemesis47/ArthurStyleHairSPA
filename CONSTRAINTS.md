# CONSTRAINTS.md — Asticella di qualità

Mantenuto con la skill `constraint-driven-development` (`/constraints`). Questi vincoli **non si abbassano** per far
passare una PR. Si cambiano solo con un ADR motivato.

## Correttezza

| ID | Vincolo | Verifica |
|----|---------|----------|
| C-01 | Nessuna doppia prenotazione sulla stessa risorsa né per lo stesso cliente | Vincoli `EXCLUDE` + test di concorrenza (200 richieste → 1 successo) |
| C-02 | Il motore slot è una funzione pura, coperta da test di proprietà | fast-check in CI; copertura rami ≥ 95 % su `core/booking` |
| C-03 | Calcoli corretti nei giorni del cambio d'ora (IT e MT) | Test con date fisse ([06 §8](docs/06-motore-prenotazioni.md)) |
| C-04 | Lo storico non cambia se cambiano prezzi o durate | Test sullo snapshot |
| C-05 | Ogni `POST` creativo è idempotente | Test con la stessa `Idempotency-Key` |
| C-06 | Mutation score ≥ 80 % sul modulo booking | Stryker (notturno) |

## Sicurezza

| ID | Vincolo | Verifica |
|----|---------|----------|
| S-01 | Zero `sql.raw` o SQL concatenato con input esterno | ESLint custom + Semgrep custom (bloccanti) |
| S-02 | Ogni endpoint e tool ha validazione zod + policy + test di autorizzazione | Matrice generata in CI |
| S-03 | MFA obbligatoria per tutti gli utenti staff | Test E2E + controllo all'avvio |
| S-04 | Nessun segreto nella repo | gitleaks (pre-commit + CI) + push protection |
| S-05 | Nessuna vulnerabilità High/Critical aperta al rilascio | CodeQL, Semgrep, OSV-Scanner, Trivy, ZAP, sqlmap |
| S-06 | Header di sicurezza: CSP con nonce, HSTS, nosniff, frame-ancestors | Test di integrazione + Observatory grado A |
| S-07 | Container non-root, read-only, `cap_drop: ALL`; Postgres non esposto | Controllo sui file compose in CI + `nmap` esterno |
| S-08 | Dipendenze: lockfile, `minimumReleaseAge` ≥ 3 giorni, build script in allowlist, licenze in allowlist | Config pnpm + `license-checker` in CI |
| S-09 | Scritture MCP solo in due fasi, con audit | Test |
| S-10 | Nessun dato personale nei log | Test sul logger (redaction) + review |

## Performance e accessibilità

| ID | Vincolo | Verifica |
|----|---------|----------|
| P-01 | LCP < 2,5 s, INP < 200 ms, CLS < 0,1 (mobile) | Lighthouse CI con budget |
| P-02 | JS iniziale ≤ 170 KB gzip (escluso il 3D), `/prenota` ≤ 120 KB | `size-limit` |
| P-03 | Disponibilità p95 < 300 ms (14 giorni) | k6 su staging |
| A-01 | WCAG 2.2 AA, `prefers-reduced-motion` rispettato | axe in CI + verifica manuale da tastiera |

## Processo

| ID | Vincolo |
|----|---------|
| W-01 | Nessun test disattivato (`.skip`, `.only`, `xit`) su `main` |
| W-02 | Nessun `eslint-disable` / `@ts-ignore` / `@ts-expect-error` senza commento con motivazione; se strutturale, ADR |
| W-03 | TypeScript `strict`, `noUncheckedIndexedAccess`, niente `any` |
| W-04 | Migrazioni expand/contract, compatibili con la versione precedente del codice |
| W-05 | Ogni bug corretto ha un test di regressione |
| W-06 | Documentazione e glossario aggiornati nella stessa PR della modifica |
| W-07 | Backup verificati con restore test mensile; se il test fallisce, si blocca ogni rilascio fino alla correzione |
