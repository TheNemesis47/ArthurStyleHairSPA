# ADR-0002 — Mutua esclusione con vincoli `EXCLUDE` su PostgreSQL

Stato: Proposto · Data: 2026-10-31

## Contesto
Requisito non negoziabile: nello stesso intervallo una risorsa (operatore, poltrona, lavatesta) non può essere
prenotata due volte. Le richieste arrivano in concorrenza da sito, app, pannello, agenti MCP e job. I controlli "leggo e poi scrivo"
nel codice applicativo subiscono race condition.

## Decisione
- Ogni occupazione è una riga di `allocations (resource_id, during tstzrange [inizio, fine))`.
- Vincolo: `EXCLUDE USING gist (resource_id WITH =, during WITH &&) WHERE (active AND NOT forced)` (estensione `btree_gist`).
- `bookings.status` → `allocations.active` sincronizzato da trigger nella stessa transazione.
- Secondo vincolo per cliente: `EXCLUDE (customer_id WITH =, period WITH &&)` sulle prenotazioni attive.
- L'applicazione cattura `SQLSTATE 23P01` e risponde `409` con slot alternativi.
- **Prima** degli `INSERT`, `pg_advisory_xact_lock` su ogni `(resource_id, giorno locale)` coinvolto, in ordine
  crescente, con `lock_timeout`. Senza questo lock, sotto forte contesa i conflitti si manifestano come **deadlock**
  (`40P01`) risolti uno al secondo. Verificato: 200 richieste concorrenti → ~200 s senza lock, ~2 s con il lock
  ([06 §9](../06-motore-prenotazioni.md)). Il vincolo resta la garanzia; il lock è l'ottimizzazione.

## Alternative
- **Lock applicativi (Redis/advisory lock)**: corretti solo se *tutti* i percorsi li usano; un percorso dimenticato basta a rompere tutto.
- **`SERIALIZABLE`** con retry: funziona, ma i retry sono più complessi e meno espliciti di un vincolo.
- **`UNIQUE (..., during WITHOUT OVERLAPS)`** (PostgreSQL 18, vincoli temporali): elegante, ma non supporta la clausola `WHERE`
  necessaria per escludere annullate e forzate. Si può rivalutare.
- **Slot pre-generati** (una riga per slot da 15'): semplice, ma rigido con durate variabili, tempi di posa e pool.

## Conseguenze
- ✅ L'invariante vale **per costruzione**, indipendentemente da chi scrive.
- ✅ I test di concorrenza diventano semplici e deterministici.
- ⚠️ La sovrapposizione forzata richiede attenzione (vedi [06 §6](../06-motore-prenotazioni.md)).
- ⚠️ Serve PostgreSQL (niente MySQL/SQLite in produzione). I test di integrazione usano Postgres reale (Testcontainers).
