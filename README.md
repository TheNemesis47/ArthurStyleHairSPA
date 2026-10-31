# Arthur Style — Piattaforma digitale

> Sito vetrina, sistema di prenotazione, pannello di gestione, app iOS/Android e server MCP per gli agenti AI
> di **Arthur Style · Hair Spa** (Firenze, Via Sant'Egidio). Trasferimento a Malta previsto fra circa 2 mesi.
> Tel. +39 353 491 8255 · WhatsApp +39 331 754 5064 · Instagram [@arthurstylehairspa](https://www.instagram.com/arthurstylehairspa/)

**Stato attuale:** 🟡 **progettazione**, prima tornata di risposte del cliente ricevuta (31/10/2026). Pronti: documentazione,
**brand** ([logo vettoriale, palette, token](brand/README.md)), skill installate, dati mock. Il codice non è ancora scritto.
Restano P0: indirizzo (Q44), Treatwell (Q43), numero di operatori (Q07): vedi [domande aperte](docs/17-domande-aperte.md).

<p align="center"><img src="brand/logo/arthur-style-logo.svg" alt="Arthur Style — Hair Spa" width="420"></p>

---

## Cosa costruiamo

| # | Prodotto | Per chi | Sintesi |
|---|----------|---------|---------|
| 1 | **Sito vetrina** | Clienti, Google, chi arriva da Instagram | Sito moderno con GSAP e Three.js, IT/EN, SEO locale per Firenze e poi Malta |
| 2 | **Prenotazione online** | Clienti | Si sceglie trattamento, operatore e orario. **Il database impedisce le doppie prenotazioni** |
| 3 | **Pannello di gestione** | Arturo e lo staff | Calendario, trattamenti, prezzi, durate, orari, clienti, statistiche |
| 4 | **App iOS + Android** | Clienti (e poi staff) | Prenotazione, storico, notifiche push, aggiunta al calendario |
| 5 | **API unica** | Sito, pannello, app, MCP | Un solo backend: una sola fonte di verità e un solo punto di controllo sicurezza |
| 6 | **Server MCP** | Agenti AI (es. Claude) | Un agente può gestire l'agenda tramite tool limitati, autorizzati e tracciati |
| 7 | **Infrastruttura VPS** | — | Docker, Caddy, PostgreSQL, backup cifrati fuori sede, monitoraggio, hardening |

## Mappa della documentazione

Si legge in ordine. Ogni documento è autonomo, ma rimanda agli altri dove serve.

| Documento | Contenuto |
|-----------|-----------|
| [docs/README.md](docs/README.md) | Indice ragionato e come mantenere i documenti |
| [01 — Brief cliente](docs/01-brief-cliente.md) | Chi è Arturo, obiettivi, Malta, brand, vincoli |
| [02 — Requisiti](docs/02-requisiti.md) | User story, requisiti funzionali e non funzionali, priorità MoSCoW |
| [03 — Skill e workflow agenti](docs/03-skill-e-workflow-agenti.md) | **Quali skill installare** (Addy Osmani, Matt Pocock, GSAP, Three.js, Expo…) e quando usarle |
| [04 — Architettura](docs/04-architettura.md) | Stack, monorepo, componenti, diagrammi |
| [05 — Modello dati](docs/05-modello-dati.md) | Schema PostgreSQL completo e vincoli di mutua esclusione |
| [06 — Motore prenotazioni](docs/06-motore-prenotazioni.md) | Algoritmo degli slot, tempi di posa, concorrenza, hold, ora legale |
| [07 — API](docs/07-api.md) | Contratto REST, errori, idempotenza, versioning |
| [08 — Sito vetrina](docs/08-sito-vetrina.md) | Pagine, effetti GSAP/Three.js, performance budget, SEO, Instagram |
| [09 — Pannello gestione](docs/09-pannello-gestione.md) | Funzioni del pannello di Arturo |
| [10 — App mobile](docs/10-app-mobile.md) | Expo/React Native, schermate, pubblicazione sugli store |
| [11 — MCP e agenti](docs/11-mcp-agenti.md) | Server MCP, tool, OAuth 2.1, difese da prompt injection |
| [12 — Sicurezza](docs/12-sicurezza.md) | Threat model, OWASP, **SQL injection**, test di sicurezza |
| [13 — Infrastruttura VPS](docs/13-infrastruttura-vps.md) | Server, hardening, deploy, backup, monitoraggio, runbook |
| [14 — Privacy e legale](docs/14-privacy-e-legale.md) | GDPR (IT/MT), cookie, P.IVA nel sito, liberatorie foto, contratti |
| [15 — Qualità, test e CI](docs/15-qualita-test-ci.md) | Strategia di test, pipeline, quality gate |
| [16 — Roadmap](docs/16-roadmap.md) | Fasi, milestone, task con criteri di accettazione |
| [17 — Domande aperte](docs/17-domande-aperte.md) | Domande da fare ad Arturo, con priorità |
| [18 — Rischi](docs/18-rischi.md) | Registro dei rischi e mitigazioni |
| [19 — Riferimenti open source](docs/19-riferimenti-open-source.md) | Progetti e librerie da cui prendere idee o da riusare |
| [20 — Costi](docs/20-costi.md) | Costi, chi paga cosa, sostenibilità di 1.500 € + 40 €/mese |
| [21 — Dati mock](docs/21-dati-mock.md) | Listino, orari, policy e risorse di prova (seed) |
| [brand/](brand/README.md) | Logo vettoriale, palette, token di design, font, foto |
| [Glossario](docs/glossario.md) | Linguaggio di dominio condiviso (IT ↔ codice EN) |
| [ADR](docs/adr/README.md) | Registro delle decisioni architetturali |
| [Ricerche](docs/research/) | Verifiche e ricerche con data (es. test dei vincoli PostgreSQL sotto concorrenza) |
| [CONSTRAINTS.md](CONSTRAINTS.md) | Asticella di qualità, non negoziabile |
| [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) | Istruzioni per gli agenti di coding |

## Decisioni chiave (in breve)

1. **Monorepo TypeScript** (pnpm + Turborepo): stessi tipi e stesse validazioni (zod) su web, pannello, app, API e MCP. → [ADR-0001](docs/adr/0001-monorepo-typescript.md)
2. **La mutua esclusione la garantisce PostgreSQL**, non il codice applicativo: vincolo `EXCLUDE USING gist` sulle allocazioni delle risorse. Due prenotazioni sovrapposte sulla stessa risorsa sono **impossibili**, anche con richieste simultanee: **verificato** con 200 transazioni concorrenti su PostgreSQL (1 successo, 199 rifiuti). → [ADR-0002](docs/adr/0002-postgres-esclusione-risorse.md)
3. **Tempi di posa modellati**: durante la posa del colore l'operatore è libero e può servire un altro cliente; la postazione resta occupata. Gestionali generici come Calendly o Cal.com non lo fanno. → [06](docs/06-motore-prenotazioni.md)
4. **Un'unica API** (Fastify) che servono web, pannello, app e MCP. → [ADR-0003](docs/adr/0003-api-unica-fastify.md)
5. **App con Expo (React Native)**: un solo codice per iOS e Android. → [ADR-0004](docs/adr/0004-app-mobile-expo.md)
6. **Multi-sede e multi-tenant** (Firenze → Malta, fino a 10 negozi): fuso, IVA, lingua e valuta stanno sulla sede; isolamento tra organizzazioni anche nel DB (RLS, verificato). → [ADR-0008](docs/adr/0008-multi-sede-malta.md), [ADR-0009](docs/adr/0009-multi-tenancy.md)
7. **MCP come processo separato**, OAuth 2.1, solo tool in allowlist, audit di ogni chiamata. Mai un tool "esegui SQL". → [ADR-0006](docs/adr/0006-mcp-processo-separato.md)
8. **VPS europea con Docker Compose + Caddy + Cloudflare**, backup cifrati fuori sede con ripristino testato ogni mese. → [ADR-0007](docs/adr/0007-vps-docker-caddy-cloudflare.md)

## Prossimo passo

1. Chiudere le **P0** rimaste in [docs/17](docs/17-domande-aperte.md): indirizzo corretto (Q44), Treatwell (Q43), numero di operatori (Q07).
2. Nella prossima sessione: `/setup-matt-pocock-skills`, poi `/grill-with-docs` sul brief aggiornato.
3. Decidere l'opzione commerciale (A o B) in [docs/20](docs/20-costi.md) e scrivere il contratto (Q35).
4. Avviare **F0** e **F3a (vetrina)** della [roadmap](docs/16-roadmap.md). Il **D-U-N-S** per gli account store va avviato subito: può richiedere settimane.
