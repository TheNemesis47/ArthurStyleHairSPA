# 09 — Pannello di gestione

Stato: `bozza` · App: `apps/admin` (Vite + React SPA, PWA) · Host: `gestione.<dominio>`

## 1. Principio

Arturo lavora **con le mani occupate**, spesso dal telefono, tra un cliente e l'altro. Il pannello deve permettergli di
fare le 5 azioni quotidiane in **meno di 3 tocchi** ciascuna:

1. Vedere chi arriva oggi e a che ora.
2. Inserire un cliente che ha telefonato o è entrato (walk-in).
3. Spostare un appuntamento.
4. Bloccare un'ora (pausa, imprevisto).
5. Segnare un no-show.

Tutto il resto (prezzi, orari, statistiche) è secondario e può stare un livello più in profondità.

## 2. Schermate

| Schermata | Contenuto | Requisiti |
|-----------|-----------|-----------|
| **Oggi** (home su mobile) | Lista cronologica: ora, cliente, servizi, stato, note. Pulsanti rapidi: chiama, WhatsApp, "arrivato", "no-show" | ADMIN-02, 10 |
| **Calendario** | Giorno con **colonne per operatore** (react-big-calendar, `resources`), settimana, mese, agenda. Colori per categoria, bordo per stato. Le fasi di posa sono **visibili** (tratteggio): Arturo vede dove può incastrare | ADMIN-02, 04, 11 |
| Creazione rapida | Clic o tap su uno spazio vuoto → trattamenti, cliente (ricerca per nome/telefono o "nuovo"), conferma. "Prossimo orario libero" | ADMIN-03 |
| Dettaglio appuntamento | Servizi, prezzo, storico del cliente, note, azioni (sposta, annulla con motivo, no-show, completa), audit | ADMIN-10, 12 |
| Blocchi | Pausa/permesso su operatore o salone, con **anteprima dei conflitti** prima di salvare | ADMIN-05, E6 |
| **Trattamenti** | Lista per categoria, drag per l'ordine. Editor: nomi IT/EN, descrizione, prezzo, "a partire da", **editor delle fasi** (durata, operatore occupato/libero, risorse richieste), buffer, operatori abilitati, prenotabile online | ADMIN-06 |
| Orari | Griglia settimanale per operatore (più fasce), orari del salone, ferie e chiusure, "applica festività" | ADMIN-07 |
| Clienti | Ricerca, scheda (storico, spesa, no-show, consensi), note interne, unisci duplicati, export, anonimizza, blocca prenotazioni online | ADMIN-09, 16 |
| **Galleria** | Upload foto lavori (ridimensionamento, AVIF/WebP, **rimozione EXIF/GPS**), prima/dopo, categoria, collegamento obbligatorio a cliente + liberatoria (o "nessuna persona riconoscibile"), pubblica/nascondi | ADMIN-21 |
| Giornata straordinaria | Seleziona giorno/operatore → elenco appuntamenti → proponi nuovi orari / annulla in blocco → messaggio unico personalizzabile → report invii | ADMIN-22 |
| Statistiche | Occupazione per giorno/operatore, incasso **stimato**, no-show %, nuovi vs abituali, canale (web/app/Instagram/telefono), trattamenti più richiesti | ADMIN-13 |
| Impostazioni | Regole di prenotazione, notifiche e template, sede (indirizzo, P.IVA, fuso), utenti e ruoli, feature flag | ADMIN-08, 14 |
| Agenti AI | Client MCP autorizzati, ultimo uso, scope, revoca, **kill switch** | ADMIN-17 |
| Audit | Filtro per attore (persona/agente/sistema), entità, periodo | ADMIN-12 |

### Editor delle fasi (UX)

```text
Colore + piega                                     totale cliente: 1 h 50'
┌────────────────────────────┬────────┬────────────────┬──────────────┐
│ Fase                       │ Durata │ Operatore      │ Risorse      │
├────────────────────────────┼────────┼────────────────┼──────────────┤
│ Applicazione colore        │ 30'    │ ● occupato     │ Poltrona     │
│ Posa                       │ 35'    │ ○ libero       │ Poltrona     │
│ Lavaggio                   │ 10'    │ ● occupato     │ Lavatesta    │
│ Piega                      │ 30'    │ ● occupato     │ Poltrona     │
└────────────────────────────┴────────┴────────────────┴──────────────┘
 Buffer prima 0'  ·  Buffer dopo 5'      [ + aggiungi fase ]
 Anteprima: ████████░░░░░░░░██████████▒   (█ Arturo occupato  ░ libero)
```

Per i trattamenti semplici (un taglio) l'editor mostra **una sola durata**. Le fasi compaiono con "Avanzato":
la complessità non deve spaventare.

## 3. Comportamenti chiave

- **Tempo reale:** stream SSE. Una nuova prenotazione online compare con un'animazione discreta e una notifica (suono opzionale).
- **Notifiche ad Arturo fuori dal pannello:** Web Push della PWA (ADMIN-23) + email, configurabili per tipo (nuova, disdetta, spostamento).
- **Contenuti del sito:** listino e galleria si gestiscono dal pannello. I testi "editoriali" (storia di Arturo, manifesto)
  stanno nel repo (MDX IT/EN) e li modifichi tu: cambiano raramente e così restano revisionati. Un CMS headless si valuta solo se Arturo vorrà scriverli da solo ❓.
- **Drag & drop:** aggiornamento ottimistico → `PATCH` con `If-Match` → in caso di `409/412` torna indietro e spiega
  il motivo ("Lavatesta occupato alle 11:05"). **Annulla** disponibile per 10 secondi.
- **Avvisare il cliente?** Spostando o annullando, il pannello chiede: "Avviso il cliente?" (sì di default).
- **Offline e rete instabile:** la PWA mostra l'ultima agenda in cache in sola lettura, con il banner "offline". Le
  scritture **non** si accodano offline: in un sistema di prenotazioni, un conflitto risolto a posteriori è peggio di un errore immediato.
- **Sessione:** dura 30 giorni su un dispositivo fidato, ma per azioni sensibili (export clienti, utenti, MCP, prezzi in
  blocco) chiede di nuovo la passkey o il TOTP (*step-up*).
- **Accessibilità:** il calendario offre una vista **agenda** a lista come alternativa navigabile da tastiera e da screen reader.

## 4. Sicurezza specifica 🔒

- Dominio separato, `noindex`, CSP senza origini di terze parti, nessun analytics.
- MFA obbligatoria, *step-up* per le azioni sensibili, elenco delle sessioni attive con revoca, email di avviso per i login da nuovo dispositivo.
- Export CSV: **neutralizzazione della formula injection** (le celle che iniziano con `=`, `+`, `-`, `@` vengono prefissate).
- Import CSV: validazione riga per riga, anteprima, nessuna creazione di account, consensi marketing **non** importati
  senza prova del consenso.
- Template delle notifiche: motore *logic-less* (es. Mustache) con escape, variabili da allowlist, nessuna esecuzione di codice.
- Offboarding di un collaboratore: disattivazione con un clic → revoca sessioni, token push e client MCP collegati.
