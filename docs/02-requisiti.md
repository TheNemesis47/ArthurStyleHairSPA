# 02 — Requisiti

Stato: `bozza`

Priorità **MoSCoW**: **M** = Must (necessario al lancio) · **S** = Should · **C** = Could · **W** = Won't (per ora).
Ogni requisito ha un ID stabile che si richiama nei ticket, nei test e nei commit.

## Attori

| Attore | Descrizione |
|--------|-------------|
| **Visitatore** | Chiunque arrivi sul sito o sull'app senza essersi identificato |
| **Cliente** | Persona identificata (email/telefono verificati o account) |
| **Titolare** (Arturo) | Ruolo `owner`: può fare tutto, incluse impostazioni, prezzi e utenti |
| **Operatore** | Ruolo `staff`: vede e gestisce la propria agenda ed eventualmente le altre (configurabile) |
| **Reception** | Ruolo `frontdesk`: gestisce le prenotazioni di tutti ma non prezzi e impostazioni (futuro) |
| **Agente AI** | Client MCP autorizzato da un utente umano, con scope limitati |
| **Sistema** | Job pianificati: promemoria, scadenza degli hold, backup, anonimizzazione |

---

## Requisiti funzionali

### Sito vetrina (SITE)

| ID | Pri | Requisito |
|----|-----|-----------|
| SITE-01 | M | Home con hero animata (Three.js/WebGL) e fallback statico per dispositivi deboli e `prefers-reduced-motion` |
| SITE-02 | M | Pagina "Arturo / Chi siamo": storia, 20+ anni di esperienza, filosofia |
| SITE-03 | M | Pagina Servizi e prezzi, letta **dall'API**: Arturo cambia un prezzo nel pannello e il sito si aggiorna da solo |
| SITE-04 | M | Galleria lavori con prima/dopo (slider trascinabile) e filtri per categoria |
| SITE-05 | M | Contatti: indirizzo 19R, mappa con consenso, orari, telefono, WhatsApp, link Instagram |
| SITE-06 | M | CTA "Prenota" sempre visibile, con deep link `/prenota?servizio=…` (usato nella bio Instagram con UTM) |
| SITE-07 | M | Bilingue IT/EN con `hreflang`. L'italiano è la lingua predefinita a Firenze, l'inglese a Malta |
| SITE-08 | M | Pagine legali: privacy, cookie, note legali con P.IVA, termini di prenotazione |
| SITE-09 | S | Feed Instagram sincronizzato (ultimi post), con cache lato server |
| SITE-10 | S | Pagina "Malta — coming soon" con iscrizione alla lista d'attesa (double opt-in) |
| SITE-11 | S | Recensioni in evidenza (curate a mano o da Google, con attribuzione) |
| SITE-12 | C | Journal/blog per la SEO (consigli, tendenze) |
| SITE-13 | C | Gift card acquistabili online |
| SITE-14 | W | E-commerce prodotti |

### Prenotazione cliente (BOOK)

| ID | Pri | Requisito |
|----|-----|-----------|
| BOOK-01 | M | Scegliere uno o **più** trattamenti in sequenza (es. colore + taglio + piega) |
| BOOK-02 | M | Scegliere l'operatore, oppure "nessuna preferenza" (il sistema bilancia il carico) |
| BOOK-03 | M | Vedere **solo** gli orari realmente disponibili, calcolati da durate, tempi di posa, buffer, orari, ferie, prenotazioni esistenti e risorse |
| BOOK-04 | M | **Mutua esclusione garantita**: due clienti non possono **mai** ottenere la stessa risorsa nello stesso intervallo, nemmeno con richieste simultanee. In caso di conflitto il secondo riceve un messaggio chiaro e orari alternativi |
| BOOK-05 | M | Durante la compilazione lo slot resta **riservato** per un tempo breve (hold, default 10 min) |
| BOOK-06 | M | Dati richiesti: nome, cognome, email e/o telefono, consenso privacy. Note facoltative (con l'avviso di non inserire dati sanitari) |
| BOOK-07 | M | Verifica del contatto con OTP per i nuovi clienti (configurabile: email, SMS o nessuna) |
| BOOK-08 | M | Email di conferma con file `.ics`, riepilogo, prezzo indicativo e **link di gestione** sicuro |
| BOOK-09 | M | Disdetta e spostamento self-service dal link o dall'app, entro la finestra della policy (default 24 h) |
| BOOK-10 | M | Promemoria automatici (default 24 h e 2 h prima), su canali configurabili |
| BOOK-11 | M | Prezzi mostrati IVA inclusa, con "a partire da" quando il prezzo dipende dalla lunghezza dei capelli |
| BOOK-12 | S | Account cliente (login con OTP/magic link) con storico e "riprenota lo stesso" |
| BOOK-13 | S | Lista d'attesa per una data piena: alla prima disdetta si avvisa il primo in lista, con un hold dedicato |
| BOOK-14 | S | Dopo l'appuntamento, richiesta di recensione Google |
| BOOK-15 | C | Caparra o pagamento anticipato (Stripe) per servizi lunghi o clienti con no-show passati |
| BOOK-16 | C | Appuntamenti ricorrenti (es. ritocco radici ogni 4 settimane) |
| BOOK-17 | W | Prenotazioni di gruppo (es. sposa + damigelle): in v1 si gestiscono a mano dal pannello |
| BOOK-18 | S | Prenotare **per un'altra persona** (figlio, genitore) con lo stesso contatto: un account o contatto può gestire più profili cliente |
| BOOK-19 | M | Link ai termini di prenotazione (disdetta, ritardo, no-show) mostrato prima della conferma |

### Pannello di gestione (ADMIN)

| ID | Pri | Requisito |
|----|-----|-----------|
| ADMIN-01 | M | Login con **MFA obbligatoria** (passkey o TOTP) |
| ADMIN-02 | M | Calendario giorno/settimana/mese/agenda, **colonne per operatore**, colori per categoria e stato |
| ADMIN-03 | M | Creazione rapida dal calendario (clic su uno spazio vuoto), con ricerca o creazione cliente in linea |
| ADMIN-04 | M | Trascinare per spostare o ridimensionare un appuntamento; il server valida e rifiuta i conflitti |
| ADMIN-05 | M | Blocchi orari (pausa, formazione, permesso) su un operatore o sull'intero salone |
| ADMIN-06 | M | CRUD trattamenti: nome IT/EN, descrizione, categoria, **prezzo**, **fasi con durata**, **tempo di posa**, buffer, operatori abilitati, prenotabile online sì/no |
| ADMIN-07 | M | Orari settimanali per operatore (più fasce al giorno), orari del salone, chiusure e ferie, festività precaricate (IT, Firenze 24/06, MT) |
| ADMIN-08 | M | Regole di prenotazione: preavviso minimo, orizzonte massimo, granularità degli slot, finestra di disdetta, durata dell'hold, max prenotazioni future per cliente |
| ADMIN-09 | M | Schede cliente: storico, note interne, no-show, consensi, **esportazione e cancellazione GDPR** |
| ADMIN-10 | M | Stati: confermata, completata, no-show, disdetta (con motivo) |
| ADMIN-11 | M | Aggiornamento in tempo reale: una prenotazione online appare nel calendario aperto senza ricaricare |
| ADMIN-12 | M | Audit log consultabile: chi (persona/agente) ha fatto cosa e quando |
| ADMIN-13 | S | Statistiche: occupazione, incasso stimato (non fiscale), no-show, nuovi clienti, canale di provenienza |
| ADMIN-14 | S | Modelli di notifica IT/EN modificabili, con anteprima |
| ADMIN-15 | S | Sovrapposizione **forzata** consapevole (solo `owner`, con conferma e audit), per gli "incastri" voluti |
| ADMIN-16 | S | Import clienti da CSV (migrazione da agenda o gestionale precedente) |
| ADMIN-17 | S | Gestione dei client MCP autorizzati: elenco, revoca, kill switch globale |
| ADMIN-18 | S | Funziona bene su **telefono e tablet** (PWA installabile): Arturo lavorerà soprattutto da lì |
| ADMIN-19 | C | Stampa agenda del giorno |
| ADMIN-20 | C | Gestione multi-sede (Malta) dallo stesso pannello |
| ADMIN-21 | M | **Galleria lavori:** upload delle foto (con rimozione dei metadati EXIF/GPS), categoria, prima/dopo, collegamento alla **liberatoria** del cliente; il sito le mostra senza bisogno di uno sviluppatore |
| ADMIN-22 | S | **Giornata straordinaria:** "Arturo è malato" → seleziona giorno/operatore → sposta o annulla in blocco con un messaggio personalizzato a tutti i clienti coinvolti |
| ADMIN-23 | S | Notifiche ad Arturo via **Web Push** dalla PWA (iOS ≥ 16.4 se installata nella home), in attesa della modalità staff dell'app |

### App mobile (APP)

| ID | Pri | Requisito |
|----|-----|-----------|
| APP-01 | M | iOS e Android dallo stesso codice (Expo) |
| APP-02 | M | Prenotazione completa (stessa logica e stesse regole del sito) |
| APP-03 | M | Le mie prenotazioni: disdici, sposta, aggiungi al calendario |
| APP-04 | M | Notifiche push: conferma, promemoria, variazioni |
| APP-05 | M | **Cancellazione account dall'app** (obbligatoria per Apple e Google) |
| APP-06 | M | Info salone: mappa, orari, chiama, WhatsApp, Instagram |
| APP-07 | M | Universal/App Links: il link di gestione dell'email apre l'app se installata |
| APP-08 | S | "Riprenota il solito" in un tap |
| APP-09 | S | Modalità staff (ruolo `staff`/`owner`): agenda del giorno e push per ogni nuova prenotazione |
| APP-10 | C | Apple Wallet / Google Wallet pass per l'appuntamento |

### MCP / agenti (MCP)

| ID | Pri | Requisito |
|----|-----|-----------|
| MCP-01 | M | Server MCP remoto (Streamable HTTP) con OAuth 2.1 + PKCE e scope granulari |
| MCP-02 | M | Tool di lettura: agenda, disponibilità, trattamenti, riepilogo giornaliero |
| MCP-03 | M | Tool di scrittura: crea, sposta, disdici, blocca orario. Le azioni distruttive richiedono una **conferma in due fasi** |
| MCP-04 | M | Audit di ogni chiamata (client, utente, tool, esito) e rate limit per client |
| MCP-05 | M | Nessun tool generico (niente SQL, shell o HTTP arbitrario) |
| MCP-06 | S | Prompt predefiniti: "briefing di oggi", "riempi i buchi della settimana" |
| MCP-07 | C | MCP pubblico per i clienti (disponibilità + richiesta di prenotazione tramite assistenti AI) |

### Notifiche (NOTIF)

| ID | Pri | Requisito |
|----|-----|-----------|
| NOTIF-01 | M | Email transazionali (conferma, modifica, disdetta, promemoria, OTP) |
| NOTIF-02 | M | Push (app) |
| NOTIF-03 | S | SMS o WhatsApp per promemoria e OTP, con limiti anti-frode (vedi [12](12-sicurezza.md), *SMS pumping*) |
| NOTIF-04 | M | Ogni messaggio ha lingua, mittente verificato (SPF/DKIM/DMARC) e una registrazione dell'esito |
| NOTIF-05 | M | Notifica ad Arturo per ogni nuova prenotazione o disdetta (push e/o email, configurabile) |

---

## Requisiti non funzionali

| ID | Categoria | Requisito misurabile |
|----|-----------|----------------------|
| NFR-01 | Integrità | **Zero** doppie prenotazioni sulla stessa risorsa. Lo garantisce un vincolo del DB, verificato da un test di concorrenza con ≥ 200 richieste parallele: esattamente 1 successo, gli altri `409`, **nessun 500**, tutto in < 5 s |
| NFR-02 | Performance web | Core Web Vitals al p75 su mobile: **LCP < 2,5 s, INP < 200 ms, CLS < 0,1**, anche con gli effetti 3D |
| NFR-03 | Performance API | p95 < 300 ms sugli endpoint di disponibilità (finestra di 14 giorni), p95 < 150 ms sulle letture semplici |
| NFR-04 | Disponibilità | ≥ 99,5 % mensile su sito e API (VPS singola, scelta consapevole, vedi [18](18-rischi.md)) |
| NFR-05 | Backup | **RPO ≤ 15 min** (archiviazione WAL), **RTO ≤ 4 h**, ripristino testato ogni mese |
| NFR-06 | Sicurezza | OWASP ASVS 5.0 livello 2 come obiettivo; zero vulnerabilità High/Critical aperte al rilascio |
| NFR-07 | Accessibilità | WCAG 2.2 AA su sito, prenotazione, pannello e app |
| NFR-08 | i18n | Tutte le stringhe esternalizzate; date, ore, valute e telefoni formattati in base alla lingua e alla sede |
| NFR-09 | Fuso orario | Orari salvati in UTC e calcolati nel fuso della sede; corretti nei giorni del cambio d'ora (test dedicati) |
| NFR-10 | Privacy | Minimizzazione dei dati, conservazione definita, export e cancellazione entro 30 giorni dalla richiesta |
| NFR-11 | Osservabilità | Log strutturati senza PII, metriche RED sugli endpoint, alert su errori, backup falliti, coda notifiche e scadenza certificati |
| NFR-12 | Manutenibilità | TypeScript strict, copertura ≥ 90 % (rami) sul motore prenotazioni, test di proprietà sull'algoritmo degli slot |
| NFR-13 | Portabilità | Tutta l'infrastruttura ricostruibile da zero su una nuova VPS in < 2 h, partendo dalla repo e dai backup |
| NFR-14 | Costi | Costo ricorrente sotto una soglia concordata con il cliente (vedi [20](20-costi.md)) ❓ |
