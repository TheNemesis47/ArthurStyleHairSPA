# ADR-0009 — Multi-tenant pronto, fino a 10 sedi per organizzazione

Stato: Proposto · Data: 2026-10-31 · Collegato: [ADR-0008](0008-multi-sede-malta.md)

## Contesto
Non si sa se Firenze chiuderà o resterà aperta insieme a Malta. Il committente chiede un sistema **modulare, fino a
10 negozi**, e un ADR sulla multi-tenancy (Q28, Q38): la piattaforma potrebbe un giorno servire anche altri saloni.
Il budget (1.500 €) esclude però un prodotto SaaS completo (onboarding self-service, fatturazione, domini per cliente).

## Decisione
**Modello dati multi-tenant dal primo giorno, deploy single-tenant oggi.**

- Gerarchia: `organizations` (tenant = brand) → `locations` (max 10 di default, `max_locations`) → risorse, servizi, prenotazioni.
- I **clienti appartengono all'organizzazione**, non alla sede: chi prenota a Firenze ritrova il suo profilo a Malta.
- `organization_id` sulle tabelle radice (`locations`, `customers`, `bookings`, `user_roles`); le altre tabelle
  ereditano tramite `location_id`. **FK composte** `(id, organization_id)` impediscono legami tra organizzazioni diverse.
- **Row-Level Security** su tutte le tabelle di dominio con `app.org_id` impostato per transazione (*fail closed* se manca).
  Nessun ruolo applicativo ha `BYPASSRLS`. Le policy autorizzative dell'app restano il primo controllo, la RLS è il secondo.
- Il vincolo `EXCLUDE` resta globale (la RLS non lo indebolisce).
- Ruoli utente **per sede** dentro l'organizzazione (`owner` dell'organizzazione, `staff`/`frontdesk` per sede).
- Oggi: una sola organizzazione ("Arthur Style"), un solo deploy, un solo dominio. L'organizzazione si risolve dal dominio o dalla configurazione.

Verificato su PostgreSQL il 31/10/2026 ([research](../research/2026-10-31-verifica-esclusione-postgres.md)): RLS fail closed, isolamento in lettura e scrittura, FK composte, `EXCLUDE` attivo sotto RLS.

## Alternative
- **Database o schema per tenant**: isolamento massimo, ma migrazioni N volte e costi operativi alti per una persona sola.
- **Istanza per tenant** (un deploy per salone): semplice da ragionare, ma moltiplica server, backup e aggiornamenti.
- **Single-tenant puro** (niente `organizations`): più semplice oggi, ma una migrazione dolorosa il giorno in cui servisse.

## Conseguenze
- ✅ Da 1 a 10 sedi è **configurazione**; un secondo salone è "nuova organizzazione + dominio", non un nuovo progetto.
- ✅ Doppia barriera contro la fuga di dati tra organizzazioni (app + DB).
- ⚠️ Ogni transazione deve impostare `app.org_id`: helper unico in `packages/db` (es. `withOrg(orgId, tx => …)`) e test che falliscono se manca.
- ⚠️ I job trasversali (promemoria, scadenze) iterano per organizzazione.
- ⚠️ Vendere la piattaforma come SaaS richiederebbe altro (fatturazione, onboarding, brand per tenant, SLA): fuori perimetro, nuovo ADR.
