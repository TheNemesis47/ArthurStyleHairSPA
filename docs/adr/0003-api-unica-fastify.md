# ADR-0003 — Un'unica API REST (Fastify) per tutti i client

Stato: Proposto · Data: 2026-10-31

## Contesto
Sito, pannello, app iOS/Android e (indirettamente) MCP devono applicare le stesse regole. Le route API di Next.js o le
server action legherebbero il backend al sito, e l'app mobile ha bisogno di un'API stabile e versionata.

## Decisione
Un servizio `apps/api` con **Fastify 5**, schemi **zod** come fonte del contratto, **OpenAPI 3.1** generata, client
tipizzato in `packages/contracts`. Versioning nel path (`/v1`), errori RFC 9457, idempotenza sui `POST`, `ETag/If-Match`.
Plugin: `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/cors` (allowlist).

## Alternative
- **tRPC**: ottimo DX, ma contratto chiuso e meno adatto ad app mobile di lunga durata e a client esterni.
- **NestJS**: più struttura di quanta ne serva.
- **Hono**: valido; Fastify vince per maturità dei plugin di sicurezza e dell'osservabilità.
- **GraphQL**: complessità (autorizzazione per campo, limiti di query) non giustificata.

## Conseguenze
- ✅ Un solo punto in cui applicare autenticazione, autorizzazione, rate limit e audit.
- ✅ Le app vecchie continuano a funzionare grazie a `/v1` e alla versione minima.
- ⚠️ Next.js chiama l'API anche lato server (SSR/ISR): servono timeout e cache per non accoppiare le disponibilità.
