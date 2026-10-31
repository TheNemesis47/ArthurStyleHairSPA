# ADR-0005 — Autenticazione self-hosted con Better Auth

Stato: Proposto · Data: 2026-10-31

## Contesto
Servono: staff con password + MFA/passkey; clienti senza password (OTP/magic link) su web e app; un authorization server
OAuth 2.1 per i client MCP. I dati devono restare in UE e nel nostro DB.

## Decisione
**Better Auth** integrato in `apps/api`, con plugin per 2FA (TOTP), passkey (WebAuthn), email OTP / magic link,
Expo client e **OAuth provider** per MCP. ⚠️ Verificare in F1 lo stato dei plugin (le fonti 2026 indicano il plugin `mcp`
in transizione verso `oauth-provider`). Password con Argon2id (o scrypt di default, da configurare).

## Alternative
- **Auth0 / Clerk**: rapidi, ma costi crescenti, dati presso terzi, vendor lock-in.
- **Keycloak / Zitadel / Authentik**: completi e maturi, ma un servizio pesante in più da gestire e aggiornare sulla VPS.
  Restano il **piano B** se il plugin OAuth di Better Auth non soddisfacesse la spec MCP.
- **Auth fatta a mano**: no.

## Conseguenze
- ✅ Tutto in TypeScript e nello stesso DB, schema generato per Drizzle.
- ⚠️ Libreria giovane: aggiornamenti di sicurezza da seguire (Renovate + advisory).
- ⚠️ L'authorization server MCP condivide il processo con l'API: audience dei token separate e testate.
