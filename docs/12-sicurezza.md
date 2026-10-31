# 12 — Sicurezza

Stato: `in revisione` · Obiettivo: **OWASP ASVS 5.0 livello 2** · Skill: `security-and-hardening`, `/security-review`, Trail of Bits (vedi [03](03-skill-e-workflow-agenti.md))

## 1. Cosa proteggiamo (asset)

| Asset | Perché conta | Impatto di una compromissione |
|-------|--------------|-------------------------------|
| **Integrità dell'agenda** | È il lavoro di Arturo | Clienti respinti, doppie prenotazioni, reputazione |
| **Dati dei clienti** (nome, email, telefono, storico) | GDPR, fiducia | Sanzioni, obbligo di notifica entro 72 h, danno d'immagine |
| **Account owner** | Controlla tutto | Furto dei dati, sabotaggio |
| **Sito pubblico** | Vetrina del brand | Defacement, malware ai visitatori, SEO avvelenata |
| **Token di terze parti** (Instagram, email, SMS, Stripe, push) | Accesso a servizi esterni | Spam a nome del salone, costi (SMS), pubblicazioni non autorizzate |
| **Server e backup** | Contengono tutto | Perdita totale |

## 2. Chi può attaccarci (realisticamente)

- **Bot automatici:** scansioni, credential stuffing, spam nei form, *SMS pumping* (frode sui messaggi verso numeri premium).
- **Abuso della logica di business:** chi occupa tutti gli slot con hold o prenotazioni false (OWASP API6:2023 *Unrestricted Access to Sensitive Business Flows*).
- **Prompt injection** attraverso i dati che legge l'agente MCP.
- **Supply chain:** pacchetti npm compromessi (ci sono stati attacchi su larga scala nel 2025-2026), immagini Docker, skill e plugin per agenti.
- **Insider o ex collaboratori** con accessi non revocati.
- **Furto o smarrimento del telefono** di Arturo con il pannello aperto.

## 3. Threat model (STRIDE) — sintesi

| Componente | Minaccia | Controllo |
|------------|----------|-----------|
| Prenotazione pubblica | **S**poofing (prenotare a nome di altri) | OTP sul contatto (policy), link di gestione con token ad alta entropia |
| Prenotazione pubblica | **D**oS logico (hold o prenotazioni a raffica) | Turnstile, max 1 hold per sessione, rate limit IP/contatto, `max_future_bookings`, allarme sugli hold anomali |
| API | **T**ampering (prezzi o durate manipolati dal client) | Il server **ricalcola tutto**. Prezzi, durate e slot non si accettano mai dal client |
| API | **I**nformation disclosure (IDOR) | Policy a livello di oggetto su ogni lettura e scrittura, test automatici "utente A non vede B" |
| Pannello | **E**levation of privilege | RBAC per sede, controlli lato server (mai solo nascondere i pulsanti), *step-up* MFA |
| MCP | Excessive agency | Scope, due fasi, limiti, audit, kill switch ([11](11-mcp-agenti.md)) |
| Notifiche | **R**epudiation ("non ho mai disdetto") | Audit log append-only con attore e canale |
| Worker | Tampering dei job | La coda sta nel DB, i job hanno payload validati con zod e sono idempotenti |
| Infrastruttura | Accesso al server | SSH solo con chiave tramite VPN (Tailscale), firewall, nessuna porta DB esposta |

## 4. OWASP Top 10 (edizione 2025) → controlli

| Categoria | Controlli principali |
|-----------|----------------------|
| **A01 Broken Access Control** | Policy centralizzata in `core/authz`, *deny by default*, test IDOR per ogni endpoint e tool, CORS in allowlist, SSE autenticato |
| **A02 Security Misconfiguration** | Header di sicurezza (CSP con nonce, HSTS…), niente pagine di debug in produzione, container hardened, skill `insecure-defaults` in CI |
| **A03 Software Supply Chain Failures** | Lockfile, **pnpm `minimumReleaseAge`** (≥ 3 giorni), build script solo in allowlist, Renovate con ritardo, `pnpm audit` + OSV-Scanner, **SBOM** (Syft), immagini con digest fissato + Trivy, Actions fissate per SHA, skill `supply-chain-risk-auditor` |
| **A04 Cryptographic Failures** | TLS 1.2+ (Caddy), Argon2id per le password, token casuali a 256 bit **hashati** a riposo, segreti fuori dalla repo, backup cifrati |
| **A05 Injection** | Vedi **§5 SQL injection**, più XSS (React + CSP), header injection, template injection, CSV injection |
| **A06 Insecure Design** | Threat model per feature, invarianti nel DB, abuse case nei requisiti, rate limit sui flussi di business |
| **A07 Authentication Failures** | MFA obbligatoria per lo staff, passkey, rate limit e lockout progressivo, OTP a scadenza breve con tentativi limitati, sessioni ruotate al login, revoca delle sessioni |
| **A08 Software or Data Integrity Failures** | Webhook firmati, immagini firmate (cosign) o almeno con digest, migrazioni revisionate, `Idempotency-Key` |
| **A09 Logging & Alerting Failures** | Audit log append-only, log strutturati senza PII, alert su login falliti a raffica, picchi di 409/429, errori 5xx |
| **A10 Mishandling of Exceptional Conditions** | Handler di errore centralizzato (RFC 9457), *fail closed* sull'autorizzazione, timeout ovunque, nessuna eccezione non gestita che lascia transazioni aperte |

Più l'**OWASP API Security Top 10 (2023)**: BOLA → A01; *Unrestricted Resource Consumption* → limiti su range di date,
paginazione e dimensione dei body; *Sensitive Business Flows* → §3; *Unsafe Consumption of APIs* → validazione zod
anche delle risposte di Instagram, Stripe e provider.

## 5. SQL injection — difesa a strati 🔒

> L'obiettivo non è *ridurre* il rischio: è renderlo **strutturalmente impossibile**, e poi **provare** ad attaccarci per verificarlo.

### 5.1 Prevenzione

1. **Solo query parametrizzate.** Tutto l'accesso ai dati passa da Drizzle (query builder) o dal tag `sql\`` di Drizzle,
   che trasforma ogni `${valore}` interpolato in un **parametro** (`$1`, `$2`…), mai in testo SQL.
2. **Vietato `sql.raw()`** e qualunque concatenazione di stringhe SQL con input esterno. Il divieto è applicato da:
   - una regola **ESLint** custom (`no-restricted-syntax` / plugin locale) in `packages/config`;
   - una regola **Semgrep** custom (creata con la skill `semgrep-rule-creator`) che blocca la PR;
   - eccezioni ammesse solo in `packages/db/migrations/` (SQL statico, revisionato).
3. **Identificatori dinamici** (colonna di ordinamento, filtri) solo da **mappe in allowlist**:
   `const SORT = { date: bookings.period, name: customers.lastName } as const` → l'input sceglie una *chiave*, mai un nome di colonna.
4. **Validazione in ingresso** con zod (tipi, lunghezze, formati, enum). Non sostituisce la parametrizzazione, ma riduce la superficie.
5. **Minimo privilegio nel DB:** il ruolo `app_api` non ha DDL, non è superuser, non può `COPY … PROGRAM`, ha solo
   `INSERT` su audit e consensi, e ha `statement_timeout`. Anche un'iniezione riuscita farebbe danni limitati.
6. **Funzioni PL/pgSQL:** nessun `EXECUTE` con concatenazione; se serve, `format()` con `%I`/`%L` e parametri `USING`.
7. **Errori:** gli errori SQL non arrivano mai al client (niente *error-based injection*). Al client va solo un `problem+json` generico.

### 5.2 Verifica (attacchi autorizzati, solo su staging)

| Tecnica | Quando | Strumento |
|---------|--------|-----------|
| Analisi statica | Ogni PR | **CodeQL** (query `js/sql-injection`), **Semgrep** (regole ufficiali + custom) |
| Fuzzing nei test | Ogni PR | Test di integrazione che inviano payload di SQLi (`' OR 1=1--`, `'; DROP TABLE…`, payload *time-based*, Unicode) a ogni parametro e verificano risposta `400` o risultato vuoto, **mai** errori 500 o tempi anomali. Generatori fast-check di stringhe ostili |
| Scansione attiva | Ogni rilascio | **sqlmap** contro staging, autenticato con utenti di test (cliente, staff, owner), su tutti gli endpoint con parametri: `--level=5 --risk=2` e tamper script, con report allegato alla release |
| DAST | Ogni rilascio | **OWASP ZAP** (baseline + active scan) contro staging |
| Pentest | Prima del lancio e poi una volta l'anno | Checklist ASVS L2 interna + skill `audit-context-building`; pentest esterno se il budget lo consente |

> ⚠️ Le scansioni attive (sqlmap, ZAP active) si lanciano **solo su staging**, mai in produzione: possono creare dati
> sporchi e far scattare il WAF di Cloudflare.

### 5.3 Altre iniezioni

| Tipo | Difesa |
|------|--------|
| XSS | React fa l'escape di default; `dangerouslySetInnerHTML` vietato (lint); CSP con nonce; i testi ricchi (descrizioni dei servizi) passano da Markdown sanificato (DOMPurify) |
| Header/email injection | Invio tramite API del provider (non SMTP con header costruiti a mano), validazione dell'email |
| Template injection | Template logic-less con variabili in allowlist |
| CSV/formula injection | Prefisso `'` sulle celle che iniziano con `= + - @ \t \r` negli export |
| Log injection | Log JSON strutturati (pino): niente concatenazione di input nei messaggi |
| Path traversal | Nessun accesso al filesystem con percorsi forniti dall'utente; upload (foto) con nome generato e content-type verificato dai magic byte |
| SSRF | Nessuna URL fornita dall'utente viene richiesta dal server; le chiamate in uscita (Instagram, provider) vanno verso host in allowlist |
| Prompt injection | Vedi [11 §5](11-mcp-agenti.md) |

## 5-bis. IP reale del client (dietro Cloudflare) 🔒

Rate limit, lockout e allarmi lavorano sull'IP: se si sbaglia l'IP, **tutte** queste difese si rompono, perché ogni
richiesta sembra arrivare dai pochi IP di Cloudflare oppure l'IP diventa falsificabile con un header.

- Caddy accetta connessioni **solo** da Cloudflare (Authenticated Origin Pulls) e ha `trusted_proxies` limitato ai range Cloudflare.
- L'IP del client si legge da `CF-Connecting-IP` **solo** se la richiesta arriva da Cloudflare. Fastify ha `trustProxy` limitato all'IP di Caddy.
- Test automatico: una richiesta con un `X-Forwarded-For` falso **non** cambia la chiave del rate limit.
- Gli IP salvati per sicurezza (OTP, consensi) sono **hashati con salt** e ruotati (minimizzazione GDPR).

## 5-ter. Upload di immagini (galleria)

- Formati in allowlist (JPEG, PNG, WebP, HEIC), verificati dai magic byte; dimensione massima 15 MB.
- **Ri-codifica** con `sharp` (elimina payload nascosti) e **rimozione di tutti i metadati EXIF**, in particolare la
  posizione GPS: una foto scattata a casa di un cliente non deve rivelarne l'indirizzo.
- Nome file generato (UUID), file servito da un percorso statico senza esecuzione, `Content-Type` impostato dal server.

## 6. Autenticazione e sessioni

- **Staff:** email + password (min 12 caratteri, controllo contro le password compromesse con k-anonymity HIBP) +
  **MFA obbligatoria** (passkey preferita, TOTP in alternativa, 10 codici di recupero). Lockout progressivo.
- **Clienti:** nessuna password. OTP (6 cifre, 10 min, max 5 tentativi, hash in DB) o magic link (monouso, 15 min).
- **Anti-enumerazione:** "Se l'indirizzo è corretto, riceverai un codice" in ogni caso, con tempi di risposta uniformi.
- **SMS pumping:** SMS solo verso prefissi in allowlist (+39, +356; altri su richiesta), max 3 SMS per numero all'ora e
  10 al giorno, Turnstile prima dell'invio, allarme sul costo giornaliero, tetto di spesa impostato anche sul provider.
- **Cookie:** prefisso `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`; token CSRF *double submit* per le mutazioni del pannello.
- **Break-glass:** un secondo account owner (il tuo, come amministratore tecnico) con chiave hardware, per quando Arturo perde il telefono. Procedura documentata.

## 7. Segreti

- Mai nella repo: **gitleaks** in pre-commit e in CI; *push protection* di GitHub attiva.
- In produzione: file in `/etc/arthurstyle/secrets/` (permessi `0400`, proprietario dedicato) montati come *Docker secrets*.
  Copia master cifrata con **sops + age** in un repo privato separato **oppure** nel password manager del cliente ❓.
- Rotazione: all'uscita di un collaboratore, dopo un incidente e comunque una volta l'anno. Runbook in [13](13-infrastruttura-vps.md).
- Ogni segreto ha un proprietario, uno scopo e una data di creazione (inventario in `infra/secrets.inventory.md`, **senza** i valori).

## 8. Rilevamento e risposta

| Segnale | Soglia di esempio | Azione |
|---------|-------------------|--------|
| Login falliti per account | > 10 in 15 min | Lockout progressivo + email all'utente |
| Picco di `409 slot-taken` | > 20/min | Possibile bot: alza il livello di Turnstile, alert |
| Hold attivi | > 30 % degli slot del giorno | Alert + blocco automatico dell'IP o dell'ASN |
| Costo SMS | > soglia giornaliera | Stop agli SMS (feature flag) + alert |
| Errori 5xx | > 1 % per 5 min | Alert |
| Chiamate MCP in scrittura | > soglia giornaliera | Sospensione del client + alert |
| Nuovo dispositivo owner | sempre | Email di notifica |

**Piano di risposta agli incidenti** (dettaglio in [13](13-infrastruttura-vps.md) e [14](14-privacy-e-legale.md)): contenimento → valutazione → notifica al
Garante/IDPC **entro 72 h** se ci sono dati personali coinvolti → comunicazione agli interessati se il rischio è elevato → post-mortem.

## 9. Checklist pre-lancio (estratto, il dettaglio va nella release)

- [ ] Scansioni CodeQL, Semgrep e gitleaks senza finding High/Critical aperti
- [ ] sqlmap e ZAP su staging: nessuna vulnerabilità confermata
- [ ] Test IDOR/RBAC verdi per tutti gli endpoint e i tool MCP
- [ ] Header di sicurezza verificati (securityheaders.com / Mozilla Observatory: grado A)
- [ ] TLS: grado A (SSL Labs), HSTS attivo
- [ ] Porte esposte verificate da fuori (`nmap`): solo 443 (e 80 → redirect) verso Cloudflare
- [ ] Backup: restore di prova completato e cronometrato
- [ ] MFA attiva su **tutti** gli account (Cloudflare, registrar, GitHub, VPS, provider, store, Meta)
- [ ] `security.txt` pubblicato (`/.well-known/security.txt`)
- [ ] Informativa privacy, registro dei trattamenti e DPA firmati
