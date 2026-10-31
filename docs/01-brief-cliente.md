# 01 — Brief cliente

Stato: `bozza` — da validare con Arturo (vedi [17 Domande aperte](17-domande-aperte.md))

## Il cliente

| Campo | Valore | Note |
|-------|--------|------|
| Titolare | **Arturo** | Parrucchiere con **oltre 20 anni di esperienza** |
| Insegna | **Arthur Style Hair S.P.A.** | Nome abbreviato del brand: **Arthur Style** (con la *h*) |
| Indirizzo | **Via Sant'Egidio 19R, 50122 Firenze (FI)** | A Firenze la "R" (numero rosso) indica gli esercizi commerciali. Va scritta **sempre** "19R" su Google Business Profile, nello schema.org e sulle mappe, altrimenti il pin finisce al civico nero 19 |
| Telefono | +39 055 285510 | ⚠️ DA VERIFICARE: trovato su una directory online, non confermato |
| Instagram | `@arthurstylehairspa` | ❓ DOMANDA: handle da confermare. Secondo te è "tutto attaccato, tutto minuscolo" |
| Forma giuridica / P.IVA | ❓ | Serve per il footer del sito (obbligo P.IVA, vedi [14](14-privacy-e-legale.md)) e per gli account developer |
| Significato di "S.P.A." | ❓ | Quasi certamente "Hair **Spa**" (benessere) e **non** S.p.A. (società per azioni). Va chiarito, perché nelle note legali la ragione sociale deve essere esatta |

## Situazione attuale

- Il salone è operativo a Firenze, in pieno centro storico (zona Santa Croce / Sant'Ambrogio).
- **Instagram è già gestito da te:** le immagini sono già prodotte e pubblicate. Il sito deve riprendere **la stessa identità visiva** (palette, font, tono). ❓ DOMANDA: servono i file sorgente (logo vettoriale, palette, font, template dei post).
- Non sappiamo come gestisce oggi le prenotazioni (agenda cartacea? WhatsApp? Treatwell/Fresha/Uala?). È fondamentale: se esiste uno storico clienti, serve una **migrazione dati**. Se c'è un contratto con un marketplace, potrebbero esserci vincoli. ❓ DOMANDA

## Obiettivi di business

1. **Presenza online forte e moderna:** il sito deve fare colpo (effetti GSAP/Three.js) e trasmettere 20 anni di mestiere.
2. **Prenotazioni self-service 24/7** da sito e app: meno telefonate, meno buchi in agenda, meno no-show grazie ai promemoria.
3. **Controllo totale per Arturo:** calendario chiaro, trattamenti con prezzi e durate modificabili in autonomia.
4. **Preparare il trasferimento a Malta.** È l'obiettivo strategico che spiega la spinta su internet:
   - Costruire **adesso** un pubblico e una reputazione online (recensioni, Instagram, sito in inglese) da portare con sé.
   - Il sistema deve supportare **una nuova sede** (fuso, IVA, lingua, telefono +356) **senza riscrivere nulla**.
   - Lista d'attesa e interesse per Malta già raccolti dal sito (pagina "Coming soon to Malta").
5. **Gestione delegabile a un agente AI** tramite MCP: riepilogo della giornata, spostamenti, buchi da riempire, risposte rapide.

## Pubblico

| Segmento | Bisogno | Canale principale |
|----------|---------|-------------------|
| Clienti abituali di Firenze | Riprenotare in fretta, promemoria | App, WhatsApp, link di gestione |
| Nuovi clienti locali | Vedere i lavori, i prezzi, prenotare | Google (ricerca locale), Instagram → sito |
| Turisti e stranieri a Firenze | Sito in inglese, prenotazione semplice | Google Maps, sito EN |
| Futuro pubblico di Malta | Fiducia nel brand prima dell'apertura | Instagram, sito EN, lista d'attesa |

## Brand e tono

- **Posizionamento:** artigianalità + esperienza (20+ anni) + stile contemporaneo. "Spa" suggerisce cura e benessere, non solo taglio.
- **Tono:** caldo, sicuro, elegante. Niente gergo tecnico verso il cliente.
- **Visual:** da derivare dalle grafiche Instagram già prodotte. ❓ DOMANDA: caricare i materiali in `brand/` (logo SVG, palette HEX, font con licenza web, foto).
- **Foto:** servono foto professionali di salone, Arturo e lavori (prima/dopo). Per le foto dei clienti serve la **liberatoria**, sia per Instagram sia per il sito (vedi [14](14-privacy-e-legale.md)).

## Vincoli noti

- Hosting su **VPS** (scelta tua).
- Budget, tempi e numero di operatori: ❓ DOMANDA.
- Gli account esterni (dominio, store, Google Business, Meta, provider email) vanno **intestati al cliente**, con te come amministratore delegato. Così se il rapporto finisce il cliente non resta ostaggio, e Apple lo richiede di fatto (vedi [10](10-app-mobile.md), linea guida 4.2.6).

## Fuori ambito (v1)

- E-commerce di prodotti (shampoo ecc.).
- Gestionale fiscale o registratore telematico: le prenotazioni **non** sostituiscono lo scontrino elettronico.
- Gestione paghe e turni del personale oltre la disponibilità per le prenotazioni.
- Prodotto multi-tenant per altri saloni. Il codice non lo impedisce, ma non è un obiettivo (vedi [ADR-0001](adr/0001-monorepo-typescript.md)).
