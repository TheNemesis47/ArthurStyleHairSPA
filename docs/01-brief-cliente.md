# 01 — Brief cliente

Stato: `in revisione` — aggiornato il 31/10/2026 con le prime risposte (vedi [17](17-domande-aperte.md))

## Il cliente

| Campo | Valore | Note |
|-------|--------|------|
| Titolare | **Arturo** | Parrucchiere con **oltre 20 anni di esperienza** |
| Brand | **Arthur Style · Hair Spa** | Logo: "Arthur Style" in corsivo calligrafico + "HAIR SPA". Su Google la scheda si chiama "Arthur Style Hair". **"SPA" = Hair Spa**, non S.p.A. |
| Indirizzo | ❓ **Da chiarire (Q44)** | Indicato da te: *Via Sant'Egidio 19*. Directory: *19R, 50122*. **Google: Via Sant'Egidio 5, 50121 Firenze.** A Firenze la "R" indica i civici commerciali: l'indirizzo va scritto **identico** ovunque (Google, sito, schema.org) |
| Telefono | **+39 353 491 8255** | Confermato, coincide con Google |
| WhatsApp | **+39 331 754 5064** | WhatsApp Business (app) già in uso |
| Instagram | [`@arthurstylehairspa`](https://www.instagram.com/arthurstylehairspa/) | Gestito da te |
| Google | Scheda esistente: **4,7★ su 140 recensioni** | Accesso in arrivo. Le recensioni sono un patrimonio: vanno protette e fatte crescere |
| Treatwell | Presente: **4,5★ su 8 recensioni** | ❓ Q43: se le prenotazioni online sono attive bisogna coordinarle, altrimenti ci saranno doppie prenotazioni |
| Forma giuridica / P.IVA | ❓ Arriva più avanti | Serve per il footer (obbligo P.IVA) e per gli account |
| Orari attuali | Da Google: chiuso il lunedì, apre martedì alle 9 | Per il sistema: mar–ven 9–19, sab 9–18 (mock, [21](21-dati-mock.md)) |

## Situazione attuale

- Il salone è operativo nel centro storico di Firenze (zona Duomo / Sant'Ambrogio). Dalle foto: pavimento in marmo, specchi, poltrone nere, banconi bianchi.
- **Instagram è già gestito da te**, le grafiche sono pubblicate. Il logo esistente (script calligrafico taupe su crema) è stato
  **ricostruito in vettoriale** in [brand/](../brand/README.md), con palette e tipografia.
- Foto disponibili: 2 non professionali (provvisorie). Le foto professionali arriveranno più avanti.
- Prenotazioni oggi: probabilmente telefono, WhatsApp e Treatwell ❓ (Q11, Q43).

## Obiettivi di business

1. **Presenza online forte e moderna:** il sito deve fare colpo (GSAP/Three.js) e trasmettere 20 anni di mestiere.
2. **Prenotazioni self-service 24/7** da sito e app, **promemoria push** per ridurre i no-show.
3. **Controllo per Arturo da PC e telefono:** calendario chiaro, trattamenti, prezzi e durate.
4. **Trasferimento a Malta fra circa 2 mesi (≈ gennaio 2027).** È il motivo della spinta su internet:
   - costruire **adesso** pubblico e reputazione (Instagram, sito in inglese) da portare a Malta;
   - non si sa se Firenze chiuderà o resterà aperta: il sistema è **modulare, fino a 10 negozi** ([ADR-0008](adr/0008-multi-sede-malta.md), [ADR-0009](adr/0009-multi-tenancy.md));
   - **a Malta lavorerà solo Arturo**: per questo il cliente non sceglie l'operatore, ma solo sede e servizi.
5. **Gestione delegabile a un agente AI** tramite MCP (piano consumer → dati dei clienti pseudonimizzati).

## Pubblico

| Segmento | Bisogno | Canale principale |
|----------|---------|-------------------|
| Clienti abituali di Firenze | Riprenotare in fretta, promemoria | App (push), WhatsApp |
| Nuovi clienti locali | Vedere lavori e prezzi, prenotare | Google (140 recensioni!), Instagram → sito |
| Turisti e stranieri a Firenze | Sito in inglese, prenotazione semplice | Google Maps, sito EN |
| Futuro pubblico di Malta | Fiducia nel brand prima dell'apertura | Instagram, sito EN, lista d'attesa |

## Brand e tono

- **Identità:** [brand/README.md](../brand/README.md). Script calligrafico (Pinyon Script) solo per il logo; Jost per tutto il resto;
  palette Carta, Inchiostro, Espresso, Castano, Caramello, Marmo; motivo grafico delle **ciocche** (linee sottili).
- **Posizionamento:** artigianalità + esperienza (20+ anni) + cura (hair spa) + stile contemporaneo.
- **Tono:** caldo, sicuro, elegante. Niente gergo tecnico verso il cliente.

## Budget e vincoli

- **1.500 € una tantum + 40 €/mese** (Q32): vedi la verifica di sostenibilità in [20](20-costi.md).
- Hosting sulla **tua VPS** (dettagli in Q45). Account esterni **intestati al cliente**.
- Contenuti (testi, galleria) gestiti **da noi**: Arturo gestisce solo agenda, clienti, trattamenti e prezzi.
- Il consulente privacy lo individua il cliente.

## Fuori ambito (v1)

- E-commerce di prodotti.
- Gestionale fiscale o registratore telematico: le prenotazioni **non** sostituiscono lo scontrino elettronico.
- Paghe e turni del personale oltre la disponibilità per le prenotazioni.
- Automazioni WhatsApp (servirebbe la WhatsApp Business **API**, a pagamento): WhatsApp resta manuale, con il pulsante "Scrivici".
- Prenotazioni per conto di altre persone (Q39).
- Rivendita della piattaforma ad altri saloni come SaaS: l'architettura la **permette** ([ADR-0009](adr/0009-multi-tenancy.md)), ma non è un obiettivo di questa commessa.
