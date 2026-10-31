# Verifica dei vincoli di mutua esclusione su PostgreSQL

Data: 31/10/2026 · Ambiente: PostgreSQL 16 locale (sandbox di sviluppo) · Collegato a: [06 §9](../06-motore-prenotazioni.md), [ADR-0002](../adr/0002-postgres-esclusione-risorse.md)

## Procedura

1. Estrarre i blocchi `sql` di [05-modello-dati.md](../05-modello-dati.md), sostituire `uuidv7()` con `gen_random_uuid()`
   (su PG < 18) e anteporre una tabella `users` minima (in produzione la crea Better Auth).
2. Caricare lo schema in un database vuoto.
3. Creare una sede, una risorsa (`Arturo`) e un cliente di test.
4. Lanciare 200 esecuzioni concorrenti (50 in parallelo) degli script qui sotto: `seq 200 | xargs -P 50 …psql -f script.sql`.

## Script A — senza lock advisory

```sql
BEGIN;
WITH b AS (
  INSERT INTO bookings (location_id, status, source, period, hold_expires_at, total_price_cents, currency, created_by_actor)
  VALUES ('00000000-0000-0000-0000-000000000001','held','web','[2026-11-10 10:00+01,2026-11-10 10:30+01)', now()+interval '10 min',0,'EUR','{}')
  RETURNING id)
INSERT INTO allocations (location_id, resource_id, booking_id, kind, during)
SELECT '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1', id, 'service','[2026-11-10 10:00+01,2026-11-10 10:30+01)' FROM b;
SELECT pg_sleep(0.05);
COMMIT;
```

Esito: 1 successo, 199 errori, **tutti `40P01 deadlock detected`**, circa 200 s (un deadlock risolto al secondo).

## Script B — con lock advisory (soluzione adottata)

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
-- serializza le scritture per (risorsa, giorno locale) PRIMA degli INSERT; più risorse → in ordine di id
SELECT pg_advisory_xact_lock(hashtextextended('00000000-0000-0000-0000-0000000000a1' || ':2026-11-11', 0));
WITH b AS (
  INSERT INTO bookings (location_id, status, source, period, hold_expires_at, total_price_cents, currency, created_by_actor)
  VALUES ('00000000-0000-0000-0000-000000000001','held','web','[2026-11-11 10:00+01,2026-11-11 10:30+01)', now()+interval '10 min',0,'EUR','{}')
  RETURNING id)
INSERT INTO allocations (location_id, resource_id, booking_id, kind, during)
SELECT '00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1', id, 'service','[2026-11-11 10:00+01,2026-11-11 10:30+01)' FROM b;
SELECT pg_sleep(0.05);
COMMIT;
```

Esito: 1 successo, **199 `23P01`** (violazione del vincolo di esclusione), 0 deadlock, circa 2 s.

## Da portare in F1

- Questi script diventano test di integrazione Vitest + Testcontainers (**PostgreSQL 18**), parte della CI (NFR-01).
- La funzione che calcola le chiavi del lock (`resource_id:giorno_locale`, ordinate) sta in `packages/db` e la usano **tutti** i percorsi di scrittura (API, MCP, worker).

## Seconda verifica — multi-tenant e RLS (31/10/2026)

Dopo l'introduzione di `organizations` e della Row-Level Security ([ADR-0009](../adr/0009-multi-tenancy.md)) lo schema
aggiornato è stato ricaricato su PostgreSQL 16 e verificato con un ruolo `app_api` non proprietario:

| Test | Esito |
|------|-------|
| Stesso slug di sede (`firenze`) in due organizzazioni | ✅ ammesso |
| Seconda email **verificata** uguale nella stessa organizzazione | ✅ rifiutata (`customers_verified_email_uq`) |
| Walk-in con la stessa email non verificata | ✅ ammesso |
| Prenotazione con cliente di un'altra organizzazione | ✅ rifiutata (FK composta) |
| Query senza `app.org_id` impostato | ✅ **errore** (fail closed) |
| Organizzazione A vede solo i propri clienti e le proprie sedi | ✅ |
| Inserire una prenotazione per l'organizzazione B mentre si è in A | ✅ rifiutata (policy RLS) |
| `EXCLUDE` con RLS attiva | ✅ sovrapposizione rifiutata |
| Organizzazione B vede le allocazioni di A | ✅ no (0 righe) |
| Regressione: sovrapposizione, annullamento → trigger, hold → expired | ✅ |
