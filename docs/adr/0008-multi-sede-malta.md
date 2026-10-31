# ADR-0008 — Multi-sede dal primo giorno (Firenze → Malta)

Stato: Proposto · Data: 2026-10-31

## Contesto
Arturo intende trasferirsi a Malta. Non sappiamo se ci sarà un periodo con due sedi. Fuso orario (oggi uguale: CET/CEST),
IVA (IT 22 %, MT 18 % ⚠️), lingua, prefisso telefonico, dati legali e titolare GDPR possono cambiare.

## Decisione
Entità **`Location`** fin dalla prima migrazione: ogni risorsa, servizio, orario, policy e prenotazione appartiene a una sede.
Fuso, valuta, aliquota, lingua predefinita e dati legali stanno sulla sede. Ruoli utente **per sede**. URL del sito con
pagine dedicate per sede. Nessuna costante "Europe/Rome" o "22 %" nel codice.

## Alternative
- **Sede unica, poi si vedrà**: costerebbe una migrazione dolorosa proprio nel momento più delicato (il trasloco).
- **Istanze separate per sede**: duplica infrastruttura, clienti e app.

## Conseguenze
- ✅ Aprire Malta = configurazione + contenuti, non sviluppo.
- ✅ Il fuso della sede rende i calcoli corretti anche se in futuro i fusi divergessero.
- ⚠️ Un po' di complessità in più nelle query (sempre filtrare per `location_id`) e nei test di autorizzazione (IDOR tra sedi).
