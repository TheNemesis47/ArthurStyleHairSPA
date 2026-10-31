# ADR-0001 — Monorepo TypeScript (pnpm + Turborepo)

Stato: Proposto · Data: 2026-10-31

## Contesto
Sei applicazioni (sito, pannello, API, worker, MCP, app mobile) condividono lo stesso dominio: servizi, slot, prenotazioni,
regole. Lo sviluppo lo fa una persona sola con agenti AI: ogni duplicazione è un bug che aspetta di succedere.

## Decisione
Un **monorepo TypeScript** con **pnpm workspaces** e **Turborepo**. Il dominio sta in `packages/core` e i contratti
(zod + OpenAPI) in `packages/contracts`, condivisi da tutte le app. TypeScript `strict` ovunque.
pnpm è configurato con `minimumReleaseAge` (≥ 3 giorni) e i build script delle dipendenze in allowlist (difesa supply chain).

## Alternative
- **Laravel/PHP + app separata**: ecosistema maturo per i gestionali, ma due linguaggi, niente tipi condivisi con l'app.
- **Django + React Native**: come sopra.
- **Multi-repo**: più isolamento, ma versioning dei contratti molto più faticoso per una persona sola.

## Conseguenze
- ✅ Un cambio al contratto rompe la compilazione di tutti i client interessati (feedback immediato).
- ✅ Gli agenti vedono tutto il contesto in un solo repository.
- ⚠️ Le CI devono usare la cache di Turborepo per restare veloci.
- ⚠️ Single-tenant: se un giorno si vuole rivendere la piattaforma ad altri saloni serve un nuovo ADR sulla multi-tenancy (Q38).
