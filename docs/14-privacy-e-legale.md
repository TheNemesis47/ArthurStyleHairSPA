# 14 — Privacy, conformità e aspetti legali

Stato: `bozza` · ⚠️ **Questo documento non è una consulenza legale.** Elenca ciò che va predisposto e verificato con un
consulente privacy/legale e con il commercialista di Arturo, in Italia e poi a Malta.

## 1. Ruoli GDPR

| Soggetto | Ruolo | Documento |
|----------|-------|-----------|
| Attività di Arturo | **Titolare del trattamento** | Informativa, registro dei trattamenti |
| Tu (sviluppo, hosting, gestione) | **Responsabile del trattamento** (art. 28) | **DPA / nomina a responsabile** firmata con Arturo |
| Fornitori (hosting, Cloudflare, email, SMS/WhatsApp, push Expo/Apple/Google, Sentry, Stripe, Meta per Instagram) | **Sub-responsabili** | Elenco pubblico + DPA di ciascuno, preferenza per server in UE |

**Agenti AI:** se Arturo usa un assistente (es. Claude) collegato al server MCP, i dati che i tool restituiscono
(nomi dei clienti, servizi, orari) vengono elaborati dal **fornitore del modello**, che diventa un sub-responsabile.
Servono quindi: un piano o contratto con termini commerciali e DPA (non un account consumer gratuito), la
minimizzazione già prevista negli scope (`agenda:read` **senza** contatti, [11 §3](11-mcp-agenti.md)) e una menzione nell'informativa.

**Trasferimenti extra-UE:** Expo (push), Apple e Google (APNs/FCM), il fornitore del modello AI ed eventualmente Stripe
e Sentry possono trattare dati fuori dall'UE. Per ognuno va verificata la base del trasferimento (EU-US Data Privacy
Framework o clausole contrattuali standard) e va documentata nel registro. Dove possibile si scelgono regioni UE (Sentry EU, provider email UE).

Autorità: **Garante per la protezione dei dati personali** (Italia); **IDPC — Information and Data Protection
Commissioner** (Malta), quando la sede maltese sarà operativa.

## 2. Trattamenti e basi giuridiche

| Trattamento | Dati | Base giuridica | Conservazione |
|-------------|------|----------------|---------------|
| Gestione delle prenotazioni | nome, contatti, servizi, orari, note | Contratto (art. 6.1.b) | 24 mesi dall'ultimo appuntamento ❓ |
| Promemoria e notifiche di servizio | contatti | Contratto / legittimo interesse | Come sopra |
| Promemoria via WhatsApp | numero di telefono | Contratto + **opt-in** richiesto dalle policy WhatsApp Business | Fino alla revoca dell'opt-in |
| Uso da parte di agenti AI (MCP) | nomi, servizi, orari (no contatti di default) | Legittimo interesse / contratto (gestione dell'agenda) | Nessuna conservazione presso il fornitore oltre a quanto previsto dal suo DPA ⚠️ |
| Verifica del contatto (OTP) | email/telefono, IP hash | Legittimo interesse (prevenzione abusi) | 24 h |
| Account dell'app | come sopra + token push | Contratto | Fino alla cancellazione |
| Marketing (newsletter, promozioni, WhatsApp promozionale) | contatti | **Consenso** (art. 6.1.a), separato, non preselezionato, con double opt-in | Fino alla revoca |
| Lista d'attesa Malta | email, nome | Consenso | Fino all'apertura + 6 mesi, poi cancellazione o richiesta di conferma |
| Sicurezza (log, audit) | IP, user agent, azioni | Legittimo interesse | 30 giorni (log), 24 mesi (audit) |
| Statistiche del sito | aggregati senza cookie (Umami) | Legittimo interesse | Aggregati |
| Foto dei lavori (sito, Instagram) | immagine del cliente | **Consenso / liberatoria** scritta | Fino alla revoca |

### Dati sanitari: attenzione 🔒

Allergie (es. alla PPD delle tinture), patologie del cuoio capelluto e gravidanza sono **dati relativi alla salute**
(categoria particolare, art. 9). Indicazioni:

- Il campo note del cliente e le note interne riportano l'avviso **"non inserire informazioni sulla salute"**.
- Se Arturo deve davvero registrare l'esito di un *patch test* o un'allergia, serve un campo dedicato con **consenso
  esplicito** (art. 9.2.a), accesso ristretto e cifratura a livello di colonna. È una decisione da prendere con il consulente ❓.

## 3. Cookie e tracciamento

- Cookie tecnici (sessione, hold, preferenza di lingua): **nessun consenso** richiesto.
- Analytics senza cookie (Umami), configurati come "assimilabili ai tecnici" secondo le linee guida del Garante sui
  cookie (2021): niente incroci di dati e IP non conservati ⚠️ DA VERIFICARE la configurazione con il consulente.
- **Nessun banner** se si usano solo i cookie tecnici e l'analytics di cui sopra. Se si aggiungono pixel pubblicitari,
  Google Maps embed, video YouTube o widget social, serve una **CMP** conforme (rifiuto facile quanto l'accettazione, nessun cookie prima del consenso).
- Font: **self-hosted** (niente Google Fonts da CDN: in Europa ci sono state sanzioni per il trasferimento di IP).

## 4. Diritti degli interessati

| Diritto | Come si esercita |
|---------|------------------|
| Accesso / portabilità | `/v1/me/export` (app/web) e "Esporta" nella scheda cliente del pannello (JSON + PDF leggibile) |
| Rettifica | Profilo nell'app o richiesta al salone |
| Cancellazione | "Elimina account" nell'app/web, "Anonimizza" nel pannello. Le prenotazioni restano anonime per le statistiche |
| Opposizione / revoca del marketing | Link di disiscrizione in ogni messaggio, interruttore nell'app |
| Tempi | Entro 30 giorni (art. 12). Il pannello mostra le richieste aperte con scadenza |

I backup scadono entro 30 giorni (+ mensili): l'informativa spiega che i dati cancellati possono restare nei backup
cifrati fino alla loro scadenza naturale e che non vengono ripristinati in produzione.

## 5. Obblighi italiani per il sito

- **Partita IVA nella home page** (art. 35 DPR 633/1972) e in generale nel footer di ogni pagina: ragione sociale, sede, P.IVA, eventuale REA.
- **Informativa privacy** (artt. 13-14 GDPR) e **cookie policy**, in italiano e in inglese.
- **Termini di prenotazione**: disdetta, ritardo, no-show, eventuale caparra (BOOK-15). Se in futuro ci sono pagamenti
  online, servono condizioni di vendita conformi al **Codice del Consumo**, inclusa la verifica del diritto di recesso
  per i servizi con data determinata ⚠️ DA VERIFICARE con il consulente.
- **Fiscale:** le prenotazioni **non** sostituiscono il documento commerciale (scontrino elettronico). Per i pagamenti
  online (caparra) va concordato con il commercialista come documentarli ❓.
- **Accessibilità:** l'European Accessibility Act (D.Lgs. 82/2022) si applica dal 28/06/2025 a vari servizi digitali,
  ma le **microimprese** che forniscono servizi ne sono generalmente **esentate** ⚠️ DA VERIFICARE la posizione del salone.
  Puntiamo comunque a **WCAG 2.2 AA** (NFR-07): è anche SEO e qualità.

## 6. Malta (quando ci si trasferisce)

- Nuovo **titolare** (probabilmente una nuova entità maltese) → nuove informative, nuovo registro, nuovi DPA. Autorità: **IDPC**.
- Partita IVA maltese, registrazione presso il **Malta Business Registry** e dati legali nel footer della pagina della sede.
- IVA standard maltese (18 % secondo le fonti generali ⚠️ DA VERIFICARE con un commercialista maltese): i prezzi della sede di Malta la includono.
- Lingua: inglese (lingua ufficiale insieme al maltese). Termini e informativa in inglese.
- Età del consenso digitale (servizi della società dell'informazione): Italia 14 anni, Malta 13 ⚠️ DA VERIFICARE. Per i
  minori la prenotazione la fa un genitore (checkbox "sono maggiorenne o autorizzato").
- **Trasferimento dei clienti fiorentini:** i dati raccolti a Firenze non si "spostano" automaticamente al nuovo
  titolare maltese per il marketing. Serve una base giuridica (nuovo consenso). Va pianificata una campagna di ri-consenso prima del trasloco.

## 7. Contratti e proprietà (il rapporto tra te e Arturo)

Elementi che spesso mancano e poi creano problemi ❓:

- **Contratto di sviluppo**: perimetro (questo documento + roadmap), fasi, collaudo, compenso.
- **Proprietà del codice** e licenza d'uso: chi possiede cosa (il codice, il design, i contenuti). Componenti open source
  e relative licenze (vedi [19](19-riferimenti-open-source.md): **niente codice GPL o AGPL** incorporato senza valutazione).
- **Contratto di manutenzione e hosting**: SLA (es. presa in carico entro 4 h lavorative), aggiornamenti di sicurezza, upgrade annuale dell'app, costi ricorrenti a carico di chi.
- **DPA (art. 28)**, vedi §1.
- **Intestazione degli account**: dominio, store, Google Business, Meta, provider. Tutti **al cliente**, con te come amministratore.
- **Uscita** (*exit plan*): come si consegna tutto (repo, backup, accessi) se il rapporto finisce.
- **Marchio:** prima di investire a Malta, verificare la registrabilità di "Arthur Style" (EUIPO, marchio UE) per evitare contestazioni ❓.

## 8. Liberatorie per le immagini

Le foto dei clienti (prima/dopo) sul sito, sull'app e su **Instagram** richiedono una **liberatoria** scritta
(uso dell'immagine, canali, durata, revoca). Proposta: modulo digitale nel pannello (firma su tablet) collegato alla
scheda cliente e alle foto pubblicate, così una revoca permette di trovare e rimuovere subito ogni uso.
