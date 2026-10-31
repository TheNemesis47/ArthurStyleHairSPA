# 06 — Motore prenotazioni

Stato: `in revisione` · Codice: `packages/core/booking/*` · Dati: [05](05-modello-dati.md)

È il componente più critico del progetto. Se il sito è brutto, Arturo perde immagine. Se il motore sbaglia, **due
clienti si presentano alla stessa ora** e la perde davvero.

## 1. Garanzie (invarianti)

| # | Invariante | Chi la garantisce |
|---|------------|-------------------|
| I1 | Una risorsa non ha mai due allocazioni attive (non forzate) sovrapposte | **PostgreSQL** (`allocations_no_overlap`) |
| I2 | Un cliente non ha mai due prenotazioni attive sovrapposte | **PostgreSQL** (`bookings_customer_no_overlap`) |
| I3 | Uno slot proposto rispetta orari dell'operatore ∩ orari del salone − eccezioni − allocazioni − preavviso | `core` (funzione pura), verificata con test di proprietà |
| I4 | L'annullamento e la scadenza liberano le risorse in modo atomico | Trigger `bookings_status_sync` |
| I5 | Ripetere la stessa richiesta non crea due prenotazioni | `Idempotency-Key` + `UNIQUE (location_id, idempotency_key)` |
| I6 | Lo storico non cambia se cambiano prezzi o durate | `booking_items.service_snapshot` |

**I1 e I2 non dipendono dal codice applicativo.** Il calcolo degli slot (I3) è un'ottimizzazione di esperienza utente:
anche se avesse un bug, il database rifiuterebbe comunque la doppia prenotazione.

## 2. Come si descrive un trattamento: fasi e tempo di posa

Un trattamento è una **sequenza di fasi**. Ogni fase ha una durata, dice se l'operatore è occupato e quali altre
risorse richiede. Esempio: **"Colore + piega"**.

| Fase | Durata | Operatore | Altre risorse |
|------|--------|-----------|---------------|
| Applicazione colore | 30' | occupato | 1 × pool "Poltrone" |
| **Posa** | 35' | **libero** | 1 × pool "Poltrone" |
| Lavaggio | 10' | occupato | 1 × pool "Lavatesta" |
| Piega | 30' | occupato | 1 × pool "Poltrone" |
| *(buffer dopo)* | 5' | occupato (riordino) | — |

```text
          10:00      10:30          11:05  11:15          11:45 11:50
Arturo    [ colore  ][   LIBERO      ][lav.][   piega    ][buf]
Poltrona  [ colore  ][    posa       ]      [   piega    ]
Lavatesta                             [lav.]
```

Durante la posa (10:30–11:05) Arturo **può** ricevere un taglio da 30' su un'altra poltrona. È così che lavora un
salone vero. Un sistema che blocca l'operatore per 1 h 50' fa perdere incassi ogni giorno.

> ❓ DOMANDA: quante poltrone, quanti lavatesta, quanti operatori? Se c'è un solo lavatesta diventa un collo di
> bottiglia, ed è proprio quello che il modello a pool cattura.

Il pool "Poltrone" non si usa per sapere *quale* poltrona: serve a non prenotare **più clienti contemporanei delle
sedute disponibili**. Se il salone non vuole gestire le postazioni, basta un pool con capacità sufficiente oppure
nessun requisito.

## 3. Algoritmo di disponibilità

Input: `locationId`, `serviceIds[]` (in ordine), `staffPreference` (id | `any`), intervallo di date (max 31 giorni),
istante corrente (porta `Clock`). **Dal sito e dall'app `staffPreference` è sempre `any`**: il cliente non sceglie
l'operatore (Q21). Solo il pannello può indicarne uno.

```text
1. Carica la policy della sede: granularità G, preavviso minimo N, orizzonte massimo H.
2. Costruisci il TEMPLATE: concatena, servizio per servizio, buffer_before + fasi + buffer_after.
   Ogni segmento = { offsetStart, offsetEnd, staffBusy, requirements[] }.
   La durata delle fasi si moltiplica per staff_services.duration_factor_pct dell'operatore candidato.
3. Operatori candidati = abilitati a TUTTI i servizi scelti (v1: un operatore per tutta la prenotazione),
   attivi, prenotabili online (se la richiesta è pubblica).
4. Per ogni giorno D nella finestra (nel fuso della sede):
   a. Intervalli liberi dell'operatore =
        working_hours(D)  ∩  location_hours(D)
        − schedule_exceptions(closed / time_off)   (+ extra_open)
        − allocazioni attive dell'operatore (incluse quelle forzate)
   b. Per ogni risorsa dei pool richiesti: intervalli liberi = apertura − allocazioni attive.
   c. Candidati di inizio t: griglia allineata a G in ORA LOCALE (10:00, 10:15…),
      t ≥ now + N, t ≤ now + H, t ≤ last_start_local (se impostato).
   d. t è valido se:
        - ogni segmento con staffBusy è contenuto negli intervalli liberi dell'operatore;
        - per ogni requisito (pool, quantità) di ogni segmento esiste un'assegnazione di risorse libere,
          stabile tra i segmenti dello stesso servizio quando la stessa poltrona deve restare
          (es. colore → posa → piega sulla stessa poltrona: vincolo "same_resource_across_steps").
5. Se staffPreference = any: per ogni t si sceglie l'operatore secondo una politica deterministica
   (meno minuti già allocati quel giorno, poi ordine di sort_order) e si memorizza il candidato.
6. Output: [{ start, end, staffId, assignments[] }], raggruppato per giorno, già convertito per la UI.
```

- Il motore è una **funzione pura**: riceve tutti i dati già caricati e non fa I/O. Gli intervalli si calcolano con una
  piccola libreria interna (`IntervalSet`: unione, intersezione, differenza) testata a parte.
- **Complessità:** con 1–5 operatori, granularità di 15', 31 giorni e decine di allocazioni al giorno, sono migliaia
  di controlli: millisecondi. Nessuna cache nella v1. Se servisse: cache di 30 s per `(sede, servizi, giorno)`,
  invalidata da `NOTIFY booking_changed`.
- **Assegnazione delle risorse dei pool:** greedy. Per ogni segmento si prende la prima risorsa libera in
  `sort_order`, preferendo quella già usata nel segmento precedente. Con pool piccoli è sufficiente. Se in futuro
  servisse l'ottimo, si passa a un matching bipartito.

## 4. Creazione: hold → conferma

```text
POST /v1/booking-holds
  BEGIN;                                              -- READ COMMITTED basta: decide il vincolo EXCLUDE
    SET LOCAL lock_timeout = '5s';
    -- (1) serializza le scritture concorrenti sulle STESSE risorse nello STESSO giorno locale
    --     chiavi = ogni (resource_id, giorno) coinvolto, acquisite in ORDINE CRESCENTE (niente deadlock tra prenotazioni diverse)
    SELECT pg_advisory_xact_lock(hashtextextended(:resource_id || ':' || :local_date, 0));   -- × N, ordinate
    -- (2) ricalcola lo slot con i dati freschi (stesso motore) per riempire assignments
    INSERT INTO bookings (status='held', hold_expires_at = now() + hold_ttl, ...);
    INSERT INTO booking_items (...);
    INSERT INTO allocations (...)  -- una riga per segmento × risorsa
  COMMIT;
  -- INSERT su allocations viola il vincolo → SQLSTATE 23P01 → ROLLBACK → 409 Conflict con alternative
  -- 40P01 (deadlock) o 55P03 (lock_timeout) → un solo retry, poi 409/503: MAI un 500
```

- **Chi garantisce cosa:** il vincolo `EXCLUDE` è la **garanzia** (vale anche per chi dimentica il lock, ad esempio un
  job o una correzione manuale). Il lock advisory è un'**ottimizzazione** che rende la contesa ordinata e veloce.
- **Perché serve il lock — verificato** (31/10/2026, PostgreSQL 16 locale, esiti in [§9](#9-verifica-eseguita), script in [research](research/2026-10-31-verifica-esclusione-postgres.md)):
  con 200 transazioni concorrenti sullo stesso slot e **senza** lock advisory, l'invariante regge (1 successo, 199
  rifiuti) ma **tutti i 199 rifiuti sono deadlock** (`40P01`), risolti dal deadlock detector uno al secondo
  (`deadlock_timeout = 1s`): **~200 s** in totale. Ogni transazione inserisce la propria tupla e poi aspetta le altre in
  corso, che a loro volta aspettano lei. **Con** il lock advisory: 1 successo, 199 `23P01` puliti, **0 deadlock, ~2 s**.
- In un salone la contesa reale è rara (due persone sullo stesso slot nello stesso secondo), ma un bot o un picco
  dopo un post Instagram ("ho liberato 3 posti sabato!") la rendono plausibile. Il costo del lock è trascurabile.
- **409 utile:** la risposta contiene i 3 slot liberi più vicini (stesso motore), così l'utente non riparte da zero.
- **Hold scaduti:** il worker ogni minuto esegue
  `UPDATE bookings SET status='expired' WHERE status='held' AND hold_expires_at < now()`. Il trigger libera le allocazioni.
  Se un `INSERT` fallisce con `23P01` contro un hold **già scaduto ma non ancora ripulito**, l'API scade gli hold di
  quella risorsa e **riprova una sola volta**.
- **Conferma:** `POST /v1/booking-holds/{id}/confirm` verifica che l'hold appartenga alla sessione
  (`hold_session_hash`), che non sia scaduto, che l'OTP sia valido se richiesto e che non si superi
  `max_future_bookings`. Poi `UPDATE status='confirmed'`, crea il cliente se manca e genera il token di gestione.
  Il vincolo I2 (cliente) viene controllato **adesso**, perché l'hold non aveva cliente.
- **Identità del cliente alla conferma** (BOOK-07, Q17, Q39):
  - senza login, **ogni** prenotazione richiede l'OTP via email (policy `always`). Nell'app, il login (OTP una tantum) vale come verifica;
  - si prenota **solo per sé**: un'email verificata corrisponde a **un** profilo cliente per organizzazione (indice unico
    `customers_verified_email_uq`). Se esiste un profilo creato dallo staff con la stessa email non verificata, il pannello propone di unirli;
  - i **no-show** contano per il blocco automatico solo sulle prenotazioni verificate: un malintenzionato non può far bloccare un altro cliente;
  - `max_future_bookings` si applica per profilo (default 3).
- **Pannello / MCP / app con utente loggato:** possono creare direttamente `confirmed` (stessa transazione, stessi vincoli).

## 5. Spostamento e annullamento

- **Spostamento atomico:** in una sola transazione si disattivano le vecchie allocazioni e si inseriscono le nuove.
  Se c'è un conflitto, il `ROLLBACK` lascia **intatta** la prenotazione originale: nessuno resta senza appuntamento.
  I promemoria già pianificati si cancellano e si ripianificano.
- **Drag & drop nel pannello:** stesso percorso. L'interfaccia fa un aggiornamento ottimistico e torna indietro se
  arriva un `409`. `If-Match: <version>` evita di sovrascrivere modifiche concorrenti (`412 Precondition Failed`).
- **Annullamento:** `status='cancelled'`, allocazioni liberate dal trigger, notifica al cliente e ad Arturo.
  Se c'è una lista d'attesa (BOOK-13), parte il job di offerta dello slot.

## 6. Sovrapposizione forzata (ADMIN-15)

Arturo a volte **vuole** incastrare un cliente sopra un altro. Il flusso è questo:

1. Il pannello prova l'inserimento normale e riceve `409`.
2. Mostra il conflitto: "Sovrapponi comunque?". L'opzione esiste solo per il ruolo `owner`.
3. Le nuove allocazioni sono `forced = true`, quindi escluse dal vincolo. `bookings.overbooking_ack = true` e si scrive l'audit.
4. ⚠️ **Caso limite:** se poi la prenotazione *sotto* viene annullata, l'allocazione forzata resterebbe fuori dal
   vincolo e un cliente online potrebbe prenotarsi sopra senza che il DB lo blocchi. Per questo nella **stessa
   transazione** dell'annullamento si tenta `UPDATE allocations SET forced = false` sulle allocazioni forzate che si
   sovrapponevano. Se il vincolo lo permette (non c'è più conflitto) tornano protette, altrimenti restano forzate.
   Inoltre il motore slot considera **sempre** occupate le allocazioni forzate. Test dedicato obbligatorio.

## 7. Casi limite (ognuno con almeno un test)

| # | Caso | Comportamento atteso |
|---|------|----------------------|
| E1 | Due richieste simultanee per lo stesso slot | Una ottiene `201`, l'altra `409` con alternative |
| E2 | Appuntamenti consecutivi 10:00–10:30 e 10:30–11:00 | Ammessi (intervalli semiaperti) |
| E3 | **Cambio d'ora** (ultima domenica di marzo e di ottobre) | Slot nella giusta ora locale; nessuno slot nell'ora inesistente o duplicato in quella ripetuta; durata reale in minuti corretta |
| E4 | Un trattamento che finisce oltre l'orario di chiusura | Lo slot non viene proposto (salvo `last_start_local` diverso, configurato apposta) |
| E5 | Pausa pranzo a metà di un trattamento | Ammessa solo se l'operatore è libero in quel segmento (tempo di posa) **e** il salone è aperto. Altrimenti slot non valido |
| E6 | Ferie aggiunte su giorni con prenotazioni già confermate | Il pannello mostra i conflitti e chiede cosa fare (spostare, avvisare, annullare). Il blocco **non** si salva in silenzio sopra prenotazioni esistenti |
| E7 | Prezzo o durata cambiati dopo la prenotazione | La prenotazione mantiene snapshot e allocazioni originali |
| E8 | Operatore disattivato con prenotazioni future | Avviso nel pannello + elenco delle prenotazioni da riassegnare |
| E9 | Hold scaduto mentre l'utente compila | Alla conferma `410 Gone`, con proposta di ricreare l'hold se lo slot è ancora libero |
| E10 | Utente che apre 20 schede e crea 20 hold | Max **1 hold attivo** per sessione/dispositivo e max N per IP all'ora. Il nuovo hold sostituisce il vecchio |
| E11 | Bot che "occupa" tutti gli slot con hold (inventory exhaustion, OWASP API6) | Turnstile prima dell'hold, rate limit, TTL breve, allarme se gli hold sono > X % dell'agenda del giorno |
| E12 | Stesso cliente: due prenotazioni sovrapposte da web e app | Bloccato da I2 |
| E13 | Il cliente disdice dopo la finestra di disdetta (meno di **4 giorni** prima) | Il link e l'app non lo consentono e mostrano telefono e WhatsApp del salone. Il pannello può sempre |
| E14 | Prenotazione a cavallo della mezzanotte | Non ammessa (`CHECK` nel dominio: un appuntamento si svolge in un solo giorno locale) |
| E15 | Sede di Malta con fuso diverso dal cliente (turista) | Orari mostrati **nel fuso della sede**, con etichetta ("ora di Malta") |
| E16 | Festività ricorrenti (es. 24/06 San Giovanni a Firenze) | Precaricate in `holidays`, attivate come `closed` con un clic |
| E17 | Durata non multipla della granularità (es. 35' con G=15) | L'inizio è sulla griglia, la fine può non esserlo; lo slot successivo parte dalla prima tacca libera |
| E18 | Sovrapposizione forzata e poi annullamento della prenotazione sotto | Vedi §6 |
| E19 | Retry di rete dall'app (stessa `Idempotency-Key`) | Stessa risposta della prima richiesta, nessun duplicato |
| E20 | Orologio del client sbagliato | Il server usa **solo** il proprio orologio (`Clock`); il client mostra quello che riceve |

## 8. Strategia di test del motore

1. **Unit test** su `IntervalSet` e sulla costruzione del template.
2. **Test di proprietà** (fast-check, skill `property-based-testing`), con agende generate casualmente:
   - nessuno slot restituito, una volta allocato, viola I1 rispetto alle allocazioni esistenti;
   - ogni slot sta dentro gli orari dell'operatore e del salone;
   - aggiungere un'allocazione non può **aumentare** gli slot disponibili (monotonia);
   - ogni slot restituito, inserito davvero nel DB, non fallisce (oracolo = Postgres in Testcontainers).
3. **Test di concorrenza** (NFR-01): 200 richieste parallele sullo stesso slot → esattamente **1** successo, 199 `409`.
4. **Test sui fusi** con date fisse: 29/03/2026, 25/10/2026, 28/03/2027, 31/10/2027 (`Europe/Rome` e `Europe/Malta`).
5. **Golden test** su agende reali anonimizzate di Arturo (quando disponibili): il risultato deve corrispondere a ciò
   che Arturo farebbe a mano.
6. **Mutation testing** (Stryker) sul modulo `booking`: punteggio minimo 80 %.
7. **Controllo notturno delle invarianti** (job del worker, anche in produzione): query che cerca allocazioni attive
   sovrapposte, **incluse quelle forzate**, hold scaduti non ripuliti, prenotazioni `confirmed` senza allocazioni e
   allocazioni attive di prenotazioni annullate. Qualunque risultato diverso da zero genera un alert e un report nel pannello.

## 9. Verifica eseguita

Il 31/10/2026 lo schema SQL di [05](05-modello-dati.md) è stato caricato su un PostgreSQL 16 locale (con
`gen_random_uuid()` al posto di `uuidv7()`, che è nativo solo da PG18) ed è stato messo alla prova:

| Test | Esito |
|------|-------|
| Allocazione sovrapposta sulla stessa risorsa | ✅ rifiutata (`allocations_no_overlap`) |
| Intervalli adiacenti 10:00–10:30 / 10:30–11:00 | ✅ ammessi |
| Risorsa di Firenze allocata con `location_id` di Malta | ✅ rifiutata (FK composta) |
| Annullamento → trigger → risorsa liberata → nuovo inserimento | ✅ |
| Stesso cliente, due prenotazioni sovrapposte in sedi diverse | ✅ rifiutata (`bookings_customer_no_overlap`) |
| Hold senza cliente → `expired` | ❌ → **bug trovato e corretto** (il `CHECK` su `customer_id` impediva di far scadere un hold) → ✅ |
| Intervallo con estremo superiore incluso `[a,b]` | ✅ rifiutato (`CHECK`) |
| 200 transazioni concorrenti senza lock advisory | ✅ 1 successo · ⚠️ 199 deadlock · ~200 s |
| 200 transazioni concorrenti **con** lock advisory | ✅ 1 successo · 199 `23P01` · 0 deadlock · ~2 s |
| Sovrapposizione forzata → annullamento di quella sotto → "riprotezione" | ✅ `forced=false`, nuovo inserimento sopra **rifiutato** |

Seconda verifica dopo l'introduzione del multi-tenant (organizzazioni + RLS): tutti i test superati, dettaglio in
[research](research/2026-10-31-verifica-esclusione-postgres.md#seconda-verifica--multi-tenant-e-rls-31102026).

In F1 gli stessi test diventano test di integrazione automatici (Testcontainers con **PostgreSQL 18**).
