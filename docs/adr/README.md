# Architecture Decision Records

Formato: *Contesto → Decisione → Alternative → Conseguenze* (stile MADR). Gestiti con la skill `documentation-and-adrs`
(Addy Osmani) e aggiornati da `grill-with-docs` (Matt Pocock).

Regole: numerazione progressiva, **mai** riscrivere un ADR accettato. Se cambia idea, nuovo ADR con `Sostituisce: ADR-XXXX`
e il vecchio passa a `Superato da ADR-YYYY`.

| ADR | Titolo | Stato |
|-----|--------|-------|
| [0001](0001-monorepo-typescript.md) | Monorepo TypeScript (pnpm + Turborepo) | Proposto |
| [0002](0002-postgres-esclusione-risorse.md) | Mutua esclusione con vincoli `EXCLUDE` su PostgreSQL | Proposto |
| [0003](0003-api-unica-fastify.md) | Un'unica API REST (Fastify) per tutti i client | Proposto |
| [0004](0004-app-mobile-expo.md) | App mobile con Expo (React Native) | Proposto |
| [0005](0005-auth-better-auth.md) | Autenticazione self-hosted con Better Auth | Proposto |
| [0006](0006-mcp-processo-separato.md) | Server MCP come processo separato sullo stesso dominio applicativo | Proposto |
| [0007](0007-vps-docker-caddy-cloudflare.md) | VPS UE con Docker Compose, Caddy e Cloudflare | Proposto |
| [0008](0008-multi-sede-malta.md) | Multi-sede dal primo giorno (Firenze → Malta) | Proposto |

Gli ADR passano ad `Accettato` dopo la chiusura delle domande P0 ([17](../17-domande-aperte.md)).
