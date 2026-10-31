# ADR-0006 — Server MCP come processo separato sullo stesso dominio applicativo

Stato: Proposto · Data: 2026-10-31

## Contesto
Un agente AI deve poter gestire l'agenda. Gli agenti sono soggetti a prompt injection e a "eccesso di iniziativa".
La spec MCP vieta il token passthrough e richiede che il server MCP accetti solo token emessi per sé.

## Decisione
- `apps/mcp`: container separato (stessa immagine dell'API, entrypoint diverso), Streamable HTTP su `mcp.<dominio>`.
- Usa i casi d'uso e la policy di `packages/core` (nessuna logica duplicata, nessuna chiamata HTTP all'API con il token dell'utente).
- OAuth 2.1 + PKCE, audience dedicata, scope granulari, tool in allowlist, scritture in **due fasi**, audit, rate limit, kill switch.
- Nessun tool generico (SQL, shell, HTTP, messaggi liberi ai clienti).

## Alternative
- **Endpoint `/mcp` dentro l'API**: meno container, ma una vulnerabilità dell'SDK MCP esporrebbe l'API intera e non si potrebbe spegnere da solo.
- **MCP come client HTTP dell'API**: richiederebbe token exchange (RFC 8693) per non fare passthrough. Più complesso senza vantaggi reali qui.

## Conseguenze
- ✅ Isolamento, spegnimento indipendente, metriche e log separati.
- ✅ Stesse regole di dominio di sito e pannello.
- ⚠️ La spec MCP evolve: revisione obbligatoria in F6 (`source-driven-development`).
