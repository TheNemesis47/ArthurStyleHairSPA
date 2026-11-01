# 07 — API (REST `/v1`)

Stato: `bozza` · Implementazione: `apps/api` · Contratto: OpenAPI 3.1 generata dagli schemi zod in `packages/contracts`

## 1. Principi

- **Contract-first** (skill `api-and-interface-design`): prima lo schema zod e l'OpenAPI, poi l'handler. Il client
  tipizzato per web, admin e mobile si **genera** dal contratto.
- **Versioning nel path** (`/v1`). Cambi incompatibili = `/v2`. Le app mobile vecchie restano in giro per mesi, quindi
  `/v1` resta supportata almeno 12 mesi dopo l'uscita di `/v2`. Header `Sunset` e `Deprecation`.
- **Versione minima dell'app:** `GET /v1/meta/app-config` restituisce `minSupportedVersion` per iOS e Android. Se
  l'app è più vecchia mostra "aggiorna".
- **Errori** RFC 9457 (`application/problem+json`): `type` (URI stabile, es. `https://api.<dominio>/problems/slot-taken`),
  `title`, `status`, `detail`, `instance`, più estensioni (`alternatives`, `fieldErrors`). Mai stack trace o SQL nella risposta.
- **Idempotenza:** `Idempotency-Key` (UUID) **obbligatorio** su ogni `POST` che crea qualcosa. La risposta resta salvata 24 h.
- **Concorrenza ottimistica:** risorse modificabili con `ETag: "<version>"` e `If-Match` obbligatorio su `PATCH/PUT/DELETE`
  dal pannello → `412` se qualcun altro ha modificato nel frattempo.
- **Paginazione** a cursore (`?cursor=&limit=`, max 100).
- **Date:** ISO 8601 con offset nelle risposte. La query di disponibilità accetta date **locali** della sede (`2026-11-03`).
- **Lingua:** `Accept-Language` (it/en) per i testi localizzati del catalogo.
- **Rate limit** con header `RateLimit-*` (draft IETF) e `429` + `Retry-After`.

## 2. Autenticazione

| Client | Meccanismo |
|--------|------------|
| Sito pubblico | Anonimo + Turnstile sugli endpoint sensibili. Sessione hold legata a un cookie `__Host-hold` firmato |
| Cliente (web) | Better Auth: OTP via **email** (Q17) → cookie `__Host-` `HttpOnly` `Secure` `SameSite=Lax` |
| Cliente (app) | Better Auth Expo: token di sessione in `expo-secure-store`, header `Authorization: Bearer` |
| Pannello | Better Auth: email + password (Argon2id) + **MFA obbligatoria** (passkey o TOTP), cookie di sessione + token CSRF |
| Agenti MCP | OAuth 2.1 (vedi [11](11-mcp-agenti.md)). I token MCP **non** sono accettati da `/v1` e viceversa (audience diversa) |
| Webhook (Stripe ecc.) | Verifica della firma HMAC + tolleranza sul timestamp + idempotenza sull'`event.id` |

## 3. Endpoint pubblici

| Metodo | Path | Descrizione | Note |
|--------|------|-------------|------|
| GET | `/v1/locations` | Sedi attive | Cache CDN 5' |
| GET | `/v1/locations/{slug}` | Dettaglio: indirizzo, orari, contatti | |
| GET | `/v1/locations/{slug}/services` | Catalogo prenotabile (categorie, prezzi, durata **totale percepita**) | Le fasi interne non si espongono |
| GET | `/v1/availability` | `?location=&services=a,b&from=2026-11-03&to=2026-11-16` | Max 31 giorni. Rate limit. **Nessun parametro operatore** (Q21): l'assegnazione è interna |
| POST | `/v1/booking-holds` | Crea un hold `{location, services[], start}` | Turnstile, idempotente, max 1 attivo per sessione. L'operatore lo sceglie il server |
| DELETE | `/v1/booking-holds/{id}` | Rilascia l'hold (l'utente torna indietro) | Solo il proprietario della sessione |
| POST | `/v1/booking-holds/{id}/confirm` | Conferma con dati cliente, consensi, OTP | `201` + riepilogo |
| POST | `/v1/otp` | Richiede un OTP via email | Risposta **sempre** generica (anti-enumerazione), limiti per destinatario e IP |
| POST | `/v1/otp/verify` | Verifica l'OTP | Max 5 tentativi, poi blocco |
| GET | `/v1/manage/{token}` | Prenotazione dal link di gestione | Token a 256 bit, hash in DB, `Referrer-Policy: no-referrer` |
| POST | `/v1/manage/{token}/cancel` | Disdetta self-service | Entro la finestra |
| POST | `/v1/manage/{token}/reschedule` | Spostamento `{start}` | Atomico |
| GET | `/v1/manage/{token}/ics` | File calendario | |
| POST | `/v1/waitlist` | Iscrizione lista d'attesa (data piena o Malta) | Double opt-in |
| GET | `/v1/instagram/feed` | Ultimi post dalla cache | Mai chiamate dirette a Meta dal client |
| GET | `/v1/meta/app-config` | Versione minima dell'app, feature flag pubbliche | |
| GET | `/health/live`, `/health/ready` | Healthcheck | `ready` controlla il DB. Non esposti pubblicamente |

### 3-bis. Prenotazione dal sito: regole implementate

- **Sessione dell'hold:** cookie `__Host-hold` (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, firmato HMAC-SHA-256, 24 h).
  In DB solo lo SHA-256 dell'identificativo. Il sito chiama l'API con `credentials: 'include'`; CORS ammette solo `CORS_ORIGINS`
  e una scrittura con un header `Origin` non ammesso riceve `403 forbidden-origin`.
- **Hold:** il client manda solo sede, servizi e orario; il server ricalcola lo slot e sceglie operatore e postazioni.
  Un nuovo hold della stessa sessione sostituisce il precedente (E10). Un hold scaduto non ancora ripulito non blocca l'orario.
- **Idempotenza:** la stessa `Idempotency-Key` dalla stessa sessione restituisce lo stesso hold **senza** un nuovo token
  Turnstile (i token sono monouso); da un'altra sessione → `422 idempotency-key-reused`.
- **OTP:** `POST /v1/otp` risponde sempre `202` con lo stesso corpo, anche oltre il limite di 3 codici in 15' (10 al giorno)
  per indirizzo. In DB l'HMAC del codice (chiave `OTP_SECRET`) e l'HMAC dell'IP. `POST /v1/otp/verify` restituisce un
  `verificationToken` monouso valido 15'; dopo 5 errori il codice è bloccato (`429 otp-locked`).
- **Conferma:** il token si consuma nella **stessa transazione** della conferma: se la conferma fallisce (slot, limiti) il
  token resta valido. La policy `require_contact_otp = 'new_customers'` dal sito vale come `always`: dire "per te non serve"
  rivelerebbe chi è già cliente. Una seconda conferma dello stesso hold → `409 not-held` (il token di gestione non si può
  restituire due volte: in DB c'è solo l'hash).
- **Link di gestione:** il token sta nel percorso, quindi il logger lo sostituisce con `***` e non registra IP né query
  string; helmet manda `Referrer-Policy: no-referrer`. Disdetta e spostamento valgono fino a `cancel_window_min` /
  `reschedule_window_min` prima dell'appuntamento **attuale** (default 4 giorni); oltre → `422 outside-policy` e la pagina
  mostra telefono e WhatsApp. Lo spostamento ricalcola lo slot ignorando le allocazioni della prenotazione stessa.
  Il file `.ics` usa `SEQUENCE = version`, così il calendario aggiorna l'evento spostato invece di duplicarlo.

## 4. Endpoint cliente autenticato

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/v1/me` | Profilo |
| PATCH | `/v1/me` | Aggiorna nome, lingua, consensi marketing |
| GET | `/v1/me/bookings` | Prenotazioni future e passate |
| POST | `/v1/me/bookings/{id}/cancel` · `/reschedule` | Come il link di gestione |
| POST | `/v1/me/bookings/{id}/rebook` | Propone gli slot per gli stessi servizi e lo stesso operatore |
| POST | `/v1/me/push-tokens` · DELETE | Registra o rimuove un token push |
| GET | `/v1/me/export` | Export GDPR (JSON) |
| DELETE | `/v1/me` | **Cancellazione account** (Apple 5.1.1(v), Google Play): anonimizza e revoca le sessioni |

## 5. Endpoint pannello (`/v1/admin/*`) — RBAC per sede

| Area | Endpoint principali | Ruolo minimo |
|------|---------------------|--------------|
| Sedi | `GET /locations` (sedi dell'organizzazione visibili all'utente), CRUD `/locations` (max 10) | owner |
| Calendario | `GET /calendar?location&from&to&resources` (allocazioni + prenotazioni), `GET /events` (SSE) | staff |
| Prenotazioni | `POST /bookings` · `PATCH /bookings/{id}` (sposta/modifica) · `POST /bookings/{id}/status` (completed/no_show/cancelled) · `POST /bookings/{id}/force` | staff · force: **owner** |
| Blocchi | `POST /blocks` · `DELETE /blocks/{id}` · `POST /blocks/preview` (mostra i conflitti prima di salvare) | staff |
| Catalogo | CRUD `/services`, `/services/{id}/steps`, `/categories`, `/pools`, `/resources` | owner |
| Orari | CRUD `/working-hours`, `/location-hours`, `/exceptions`, `POST /holidays/apply` | owner (staff: solo i propri permessi/ferie, se abilitato) |
| Clienti | `GET /customers?q=` · `GET/PATCH /customers/{id}` · `POST /customers/{id}/merge` · `GET /customers/{id}/export` · `POST /customers/{id}/anonymize` · `POST /customers/import` (CSV) | staff (export/anonymize/import: owner) |
| Policy | `GET/PUT /policy` | owner |
| Notifiche | CRUD `/notification-templates` + `POST /notification-templates/{id}/preview` | owner |
| Statistiche | `GET /stats?from&to` | owner |
| Audit | `GET /audit?entity&actor&from&to` | owner |
| Utenti | CRUD `/users`, `/roles`, revoca sessioni | owner |
| MCP | `GET /mcp-clients` · `DELETE /mcp-clients/{id}` (revoca) · `PUT /mcp-settings` (kill switch) | owner |
| Feature flag | `GET/PUT /feature-flags` | owner |

## 6. Codici di errore di dominio (`type`)

| `type` | HTTP | Quando |
|--------|------|--------|
| `slot-taken` | 409 | Violazione del vincolo `EXCLUDE` (con `alternatives[]`) |
| `customer-overlap` | 409 | Il cliente ha già un appuntamento in quell'orario |
| `hold-expired` | 410 | Conferma oltre il TTL |
| `hold-not-owned` | 403 | L'hold appartiene a un'altra sessione |
| `outside-policy` | 422 | Preavviso, orizzonte o finestra di disdetta non rispettati |
| `too-many-future-bookings` | 422 | Superato `max_future_bookings` |
| `customer-blocked` | 403 | Cliente bloccato per le prenotazioni online (messaggio neutro) |
| `otp-required` / `otp-invalid` / `otp-locked` | 401/401/429 | Verifica del contatto |
| `version-conflict` | 412 | `If-Match` non corrisponde |
| `validation` | 400 | Schema zod violato (`fieldErrors`) |
| `rate-limited` | 429 | Limite superato |

## 7. Esempio

```http
POST /v1/booking-holds HTTP/1.1
Host: api.<dominio>
Content-Type: application/json
Idempotency-Key: 0192f5a4-7b1c-7cde-9a10-3f2b8c1d4e55
CF-Turnstile-Response: <token>

{"location":"firenze","services":["colore-piega"],"start":"2026-11-03T10:30:00+01:00"}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://api.<dominio>/problems/slot-taken",
  "title": "Questo orario è appena stato prenotato",
  "status": 409,
  "alternatives": [
    {"start":"2026-11-03T10:45:00+01:00"},
    {"start":"2026-11-03T11:15:00+01:00"},
    {"start":"2026-11-03T14:00:00+01:00"}
  ]
}
```
