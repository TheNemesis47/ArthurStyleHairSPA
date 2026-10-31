# Glossario di dominio

Stato: `vivo` · Mantenuto con le skill `domain-modeling` e `grill-with-docs`. Un termine nuovo **prima** si definisce
qui, **poi** si usa nel codice.

| Italiano (UI e doc) | Codice (EN) | Definizione |
|---------------------|-------------|-------------|
| **Sede** | `Location` | Un salone fisico, con fuso, valuta, IVA, lingua predefinita e dati legali. Firenze è la prima, Malta la prossima |
| **Risorsa** | `Resource` | Qualsiasi cosa che si può occupare per un intervallo: operatore, postazione, attrezzatura |
| **Operatore** | `Resource(kind=staff)` | Persona che esegue i trattamenti. Può essere collegata a un utente del pannello |
| **Postazione** | `Resource(kind=station)` | Poltrona, lavatesta |
| **Attrezzatura** | `Resource(kind=equipment)` | Casco, vaporizzatore, altro bene limitato |
| **Pool** | `ResourcePool` | Insieme di risorse equivalenti ("una qualsiasi delle 2 lavatesta") |
| **Trattamento / Servizio** | `Service` | Ciò che il cliente prenota, con prezzo e sequenza di fasi |
| **Categoria** | `ServiceCategory` | Raggruppamento per la vetrina (Taglio, Colore, Trattamenti…) |
| **Fase** | `ServiceStep` | Parte di un trattamento con durata propria; dice se l'operatore è occupato e quali risorse servono |
| **Tempo di posa** | `ServiceStep(staffBusy=false)` / `allocation.kind=processing` | Fase in cui il prodotto agisce: l'operatore è libero, la postazione resta occupata |
| **Buffer** | `bufferBefore` / `bufferAfter` | Tempo di preparazione o riordino attorno al trattamento, non visibile al cliente come durata |
| **Durata percepita** | `customerDuration` | Dall'inizio della prima fase alla fine dell'ultima (esclusi i buffer). È ciò che vede il cliente |
| **Orario di lavoro** | `WorkingHours` | Fasce settimanali di un operatore, in ora locale |
| **Orario di apertura** | `LocationHours` | Fasce settimanali del salone, limite per tutti |
| **Eccezione** | `ScheduleException` | Chiusura, ferie, permesso o apertura straordinaria su un intervallo concreto |
| **Festività** | `Holiday` | Data proposta come chiusura (nazionale, locale come San Giovanni a Firenze, o maltese) |
| **Politica di prenotazione** | `BookingPolicy` | Regole della sede: granularità, preavviso, orizzonte, finestra di disdetta, TTL dell'hold, limiti |
| **Granularità** | `slotGranularity` | Passo della griglia degli orari di inizio (es. 15') |
| **Slot** | `Slot` | Un orario di inizio **proponibile** per una combinazione di servizi e operatore. Calcolato, non salvato |
| **Disponibilità** | `Availability` | Insieme degli slot in un intervallo di date |
| **Prenotazione** | `Booking` | L'appuntamento di un cliente: uno o più trattamenti consecutivi, uno stato, un'origine |
| **Riga di prenotazione** | `BookingItem` | Un trattamento dentro la prenotazione, con la fotografia del servizio (snapshot) |
| **Allocazione** | `Allocation` | L'occupazione di **una** risorsa per **un** intervallo. È l'unità su cui il DB garantisce la mutua esclusione |
| **Blocco** | `Allocation(kind=block)` | Occupazione manuale senza cliente (pausa, corso, imprevisto) |
| **Hold / Prenotazione provvisoria** | `Booking(status=held)` | Slot tenuto da parte per pochi minuti mentre il cliente completa i dati |
| **Conferma** | `confirm` | Passaggio da hold a prenotazione confermata |
| **Sovrapposizione forzata** | `forced` / `overbookingAck` | Incastro voluto dall'owner che il DB ignora consapevolmente (con audit) |
| **No-show** | `no_show` | Il cliente non si è presentato |
| **Walk-in** | `source=walk_in` | Cliente entrato senza prenotazione, inserito al momento |
| **Link di gestione** | `manageToken` | Link segreto per disdire o spostare senza account |
| **OTP** | `OtpChallenge` | Codice monouso per verificare email o telefono |
| **Lista d'attesa** | `WaitlistEntry` | Richiesta di essere avvisati se si libera un posto (o per l'apertura di Malta) |
| **Cliente** | `Customer` | Persona che prenota; può avere o non avere un account |
| **Utente** | `User` | Account che accede (staff o cliente con app) |
| **Ruolo** | `Role` | `owner`, `staff`, `frontdesk` (per sede) |
| **Agente** | `Agent` / MCP client | Software AI autorizzato da un utente umano tramite OAuth |
| **Scope** | `scope` | Permesso concesso a un agente (`agenda:read`…) |
| **Conferma in due fasi** | `prepare_*` / `confirm_*` | Schema dei tool MCP: anteprima, poi esecuzione |
| **Kill switch** | `mcp_enabled=false` | Interruttore che disattiva subito tutti gli agenti |
| **Audit log** | `AuditLog` | Registro immutabile di chi ha fatto cosa |
