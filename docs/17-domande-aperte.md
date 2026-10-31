# 17 — Domande aperte e decisioni

Stato: `aggiornato 31/10/2026` (prima tornata di risposte) · Strumenti: `to-questionnaire`, `grill-with-docs`

**P0** = blocca l'inizio · **P1** = serve entro la fase indicata · **P2** = più avanti.
✅ = risposta ricevuta · 🟡 = decisa da noi (default proposto, confermabile) · ❓ = ancora aperta.

## Risposte ricevute (31/10/2026)

| # | Domanda | Risposta / decisione | Effetti |
|---|---------|---------------------|---------|
| Q01 | Instagram | ✅ [`@arthurstylehairspa`](https://www.instagram.com/arthurstylehairspa/) | 01, 08 |
| Q02 | Ragione sociale, P.IVA, "S.P.A." | ✅ "SPA" = **Hair Spa** (lo dice il logo). P.IVA e forma giuridica arrivano più avanti ❓ | Footer legale bloccato fino alla P.IVA |
| Q03 | Telefono e WhatsApp | ✅ Tel. **+39 353 491 8255** (coincide con Google) · WhatsApp **+39 331 754 5064** (WhatsApp Business già in uso) | 01, 08, schema.org |
| Q04 | Profilo Google Business | ✅ Esiste (4,7★, 140 recensioni) e l'accesso verrà dato. Su Google risulta anche **Treatwell** (4,5★, 8 recensioni) → vedi Q43 | 08 §6, 18 |
| Q05 | Logo, palette, font | ✅ Logo da rifare in vettoriale → **fatto** ([brand/](../brand/README.md)): Pinyon Script + Jost, palette campionata | brand/ |
| Q06 | Foto | ✅ Per ora 2 foto non professionali (in `brand/photos/`), le altre più avanti | 08 |
| Q09 | Listino | ✅ Si inserisce a lavoro finito; per ora **mock** → [21](21-dati-mock.md) | 21 |
| Q10 | Orari | ✅ Orari "normali da parrucchiere" (deve trasferirsi): **mar–ven 9–19, sab 9–18, dom–lun chiuso** (mock coerente con Google, "apre mar alle 9") | 21 |
| Q13 | Dispositivi | ✅ **PC e telefono** | 09 |
| Q14 | Preavviso minimo | ✅ 2–3 ore → **3 ore** (configurabile) | 05, 21 |
| Q15 | Orizzonte | ✅ "Un mese… 5 giorni": interpretato come **35 giorni** 🟡 da confermare | 05, 21 |
| Q16 | Disdetta/spostamento gratis | ✅ Fino a **4 giorni prima**. Dopo: solo contattando il salone | 05, 06, 08 |
| Q17 | Verifica contatto | ✅ **OTP via email** (per chi prenota senza essere loggato nell'app) | 06, 07 |
| Q19 | Canale promemoria | ✅ **Notifiche push** (preferite a WhatsApp). 🟡 Chi non ha l'app riceve l'**email** (senza promemoria si perderebbero i clienti web) | 04, 10 |
| Q21 | Scelta operatore | ✅ **No:** il cliente sceglie solo **sede e servizi**; l'operatore lo assegna il sistema (a Malta lavorerà solo Arturo) | 02, 06, 07, 08 |
| Q22 | Dominio | ✅ Lo sceglie il committente, **`.com`** | 04 |
| Q23 | Lingue | ✅ Italiano + inglese | — |
| Q24 | WhatsApp Business | ✅ In uso (app) con il +39 331 754 5064 → pulsante "Scrivici su WhatsApp". Nessuna automazione WhatsApp (servirebbe la Business API) | 08, 14 |
| Q25 | Casi d'uso dell'agente | 🟡 Deciso da noi: briefing giornaliero, spostamenti, blocchi, buchi da riempire + bozza di post Instagram, report settimanale | 11 |
| Q26 | Modalità staff nell'app | 🟡 Sì, in F5 (Arturo gestisce anche da telefono). Fino ad allora PWA + Web Push | 09, 10 |
| Q27 | Trasferimento a Malta | ✅ Indicativamente **fra un paio di mesi** (≈ gennaio 2027) → roadmap riordinata | 16 |
| Q28 | Firenze chiude? | ✅ Non si sa → sistema **modulare, fino a 10 negozi** | ADR-0008, ADR-0009 |
| Q32 | Budget | ✅ **1.500 € una tantum + 40 €/mese** | 20 (verifica di sostenibilità) |
| Q33 | Tempi | ✅ Nessuna scadenza imposta (ma vedi Q27) | 16 |
| Q34 | Intestazione account | ✅ Tutto **intestato al cliente** | 10, 14 |
| Q36 | VPS | ✅ Ce l'hai già → dettagli in Q45 | 13 |
| Q37 | Consulente privacy | ✅ Se ne occupa il cliente | 14 |
| Q38 | Multi-tenancy | ✅ Sì → [ADR-0009](adr/0009-multi-tenancy.md) | 05 |
| Q39 | Prenotare per altri | ✅ **No**, solo per sé stessi | 02 (BOOK-18 → W) |
| Q40 | Chi modifica i testi | ✅ **Noi** (tu e io); Arturo non tocca contenuti → testi e galleria nel repo | 09 |
| Q41 | Allergie / patch test | ✅ Non si registra nulla → nessun dato sanitario | 14 |
| Q42 | Piano AI per l'MCP | ✅ **Piano consumer** → pseudonimizzazione obbligatoria dei clienti nei tool MCP | 11, 14 |

## Ancora aperte

| # | Pri | Domanda | Perché serve | Proposta / default |
|---|-----|---------|--------------|--------------------|
| Q07 | **P0** | Quanti operatori lavorano oggi a Firenze, e con che orari? | Risorse, calendario | Mock: 2 (Arturo + 1). A Malta: solo Arturo |
| Q08 | P1 | Quante poltrone/postazioni e lavatesta? | Pool di risorse | Mock: 3 poltrone, 2 lavatesta |
| Q11 | **P0** | Come prenota oggi? **Treatwell è attivo** con prenotazioni online? | Rischio di **doppie prenotazioni tra due sistemi** (vedi Q43) | — |
| Q12 | P1 | Servizi da **non** rendere prenotabili online (es. sposa)? | Catalogo | Sposa e cheratina solo su consulenza |
| Q18 | P1 | Politica no-show | — | Blocco delle prenotazioni online dopo 2 no-show |
| Q20 | P2 | Caparra o pagamenti online? | F7 | No per ora |
| Q29 | P2 | Zona di Malta | SEO locale, pagina sede | Non nota |
| Q30 | P2 | Società maltese o sede secondaria? | Titolare GDPR, IVA | Non noto |
| Q31 | P2 | Registrazione marchio | Protezione del brand | Non noto. Nota: il logo usa un font libero (vedi brand/README) |
| Q35 | P1 | Contratto di sviluppo e manutenzione scritto (perimetro, SLA, proprietà del codice) | Tutela di entrambi | Bozza basata su [20](20-costi.md) |
| Q02b | **P0 per il go-live** | P.IVA e ragione sociale | Footer obbligatorio | Arriva dopo |

## Nuove domande (emerse dallo screenshot di Google e dalle risposte)

| # | Pri | Domanda | Perché serve |
|---|-----|---------|--------------|
| Q43 | **P0** | **Treatwell:** è attivo? Il pulsante "Prenota online" di Google porta lì? Lo si disattiva quando parte il nostro sistema? | Due agende indipendenti = doppie prenotazioni sicure. Proposta: al go-live il link "Prenota" di Google punta al nostro sito e la prenotazione online su Treatwell si chiude (oppure si tengono gli slot Treatwell bloccati a mano) |
| Q44 | **P0** | **Indirizzo:** tu hai indicato *Via Sant'Egidio 19*, una directory riporta *19R, 50122*, Google riporta **Via Sant'Egidio 5, 50121**. Qual è quello giusto? | Coerenza NAP (SEO locale), schema.org, mappe, note legali |
| Q45 | P1 | La tua VPS: provider, **paese del data center** (UE?), CPU/RAM/disco, sistema operativo, altri progetti ospitati? | Capacità, GDPR, isolamento tra progetti, piano di backup |
| Q46 | P1 | Confermi **35 giorni** come orizzonte di prenotazione? | Q15 era ambigua |
| Q47 | P1 | Quale assistente userà Arturo (Claude, ChatGPT…)? Con il piano consumer i connettori MCP remoti potrebbero non essere disponibili o essere limitati ⚠️ da verificare | Fattibilità di F6 |
