# 17 — Domande aperte

Stato: `aperto` · Si possono trasformare in questionario per Arturo con la skill `to-questionnaire` e approfondire con `grill-with-docs`.

**P0** = blocca l'inizio dello sviluppo · **P1** = serve entro la fase indicata · **P2** = si può decidere più avanti.
Quando una domanda si chiude si scrive la risposta, la data e chi ha deciso. Se la risposta cambia l'architettura, si apre un ADR.

## Identità e attività

| # | Pri | Domanda | Perché serve | Proposta / default |
|---|-----|---------|--------------|--------------------|
| Q01 | P0 | Handle Instagram esatto? (`@arthurstylehairspa`?) | Link, API, SEO | — |
| Q02 | P0 | Ragione sociale, forma giuridica, P.IVA, REA. Cosa significa "S.P.A." nel nome? | Footer obbligatorio, account developer, D-U-N-S | Probabilmente "Hair **Spa**" |
| Q03 | P0 | Telefono e WhatsApp ufficiali (lo 055 285510 è corretto?) | Contatti, schema.org, Google Business | — |
| Q04 | P1 | Esiste già un profilo Google Business? Recensioni? Chi ne ha l'accesso? | SEO locale | Rivendicarlo |
| Q05 | P1 | Logo vettoriale, palette, font (con licenza web) usati nelle grafiche Instagram | Design | Caricare in `brand/` |
| Q06 | P1 | Foto professionali disponibili? Si può organizzare uno shooting (salone, Arturo, lavori)? | Sito, store | Shooting prima di F3 |

## Come lavora il salone

| # | Pri | Domanda | Perché serve | Proposta / default |
|---|-----|---------|--------------|--------------------|
| Q07 | P0 | Quanti operatori lavorano con Arturo? Orari di ciascuno? | Risorse, colonne del calendario | — |
| Q08 | P0 | Quante poltrone/postazioni e quanti lavatesta? Attrezzature condivise (casco, vaporizzatore)? | Pool di risorse | — |
| Q09 | P0 | **Listino completo:** per ogni trattamento prezzo, durata, fasi, **tempi di posa**, varianti (corti/medi/lunghi) | Catalogo e motore slot | Template di raccolta in F0.2 |
| Q10 | P0 | Orari di apertura, pausa pranzo, giorno di chiusura, ferie abituali (agosto?) | Disponibilità | — |
| Q11 | P0 | Come gestisce oggi le prenotazioni? (agenda cartacea, WhatsApp, Treatwell/Fresha/Uala, altro gestionale) | Migrazione dati, eventuali vincoli contrattuali | Import CSV (ADMIN-16) |
| Q12 | P1 | Arturo vuole "incastrare" clienti durante le pose? Ci sono servizi da **non** rendere prenotabili online? | Configurazione | Sì al primo, flag per servizio |
| Q13 | P1 | Da quale dispositivo gestirà l'agenda: telefono, tablet al bancone, PC? | UX del pannello | Telefono + tablet |

## Regole di prenotazione

| # | Pri | Domanda | Proposta / default |
|---|-----|---------|--------------------|
| Q14 | P0 | Preavviso minimo per prenotare online | 2 h |
| Q15 | P0 | Quanto avanti si può prenotare | 60 giorni |
| Q16 | P0 | Fino a quando si può disdire o spostare gratis | 24 h |
| Q17 | P1 | Verifica del contatto: OTP email, SMS o nessuna? | OTP email per i nuovi clienti |
| Q18 | P1 | Politica no-show: avviso? blocco dopo N no-show? caparra? | Blocco online dopo 2 no-show, caparra in F7 |
| Q19 | P1 | Promemoria: quando e su quale canale (email, SMS, WhatsApp, push)? | 24 h + 2 h; email + push, WhatsApp da valutare |
| Q20 | P2 | Pagamenti online (caparra, pagamento anticipato, gift card)? | F7, con il parere del commercialista |
| Q21 | P2 | Il cliente può scegliere l'operatore o solo "il salone"? | Scelta facoltativa |

## Prodotto e canali

| # | Pri | Domanda | Proposta / default |
|---|-----|---------|--------------------|
| Q22 | P0 | Dominio preferito | `.com` neutro + `.it` in redirect |
| Q23 | P1 | Lingue: italiano + inglese bastano? | Sì (EN copre anche Malta) |
| Q24 | P1 | WhatsApp Business è già in uso? Con quale numero? | Link "scrivici" + valutare l'API per i promemoria |
| Q25 | P1 | Cosa vorrebbe fare Arturo **con un agente AI**? (elenco di casi reali) | Briefing, spostamenti, buchi da riempire |
| Q26 | P2 | Modalità staff nell'app: serve, o basta il pannello web? | Sì, in F5 |

## Malta

| # | Pri | Domanda | Perché serve |
|---|-----|---------|--------------|
| Q27 | P1 | Quando, indicativamente, il trasferimento? | Priorità di F7, pagina "coming soon" |
| Q28 | P1 | Firenze chiude o restano due sedi in parallelo per un periodo? | Multi-sede vs migrazione, redirect, comunicazione |
| Q29 | P2 | Città/zona a Malta (Valletta, Sliema, St Julian's…)? | SEO locale, pagina sede |
| Q30 | P2 | Nuova società maltese o sede secondaria? | Titolare GDPR, IVA, account store |
| Q31 | P2 | Registrare il marchio "Arthur Style" a livello UE? | Protezione del brand prima dell'espansione |

## Rapporto tra te e Arturo

| # | Pri | Domanda | Proposta / default |
|---|-----|---------|--------------------|
| Q32 | P0 | Budget complessivo e budget mensile ricorrente (VPS, SMS, store, provider) | Vedi [20](20-costi.md) |
| Q33 | P0 | Tempi desiderati per il go-live del sito | Gennaio, fuori dalla stagione natalizia |
| Q34 | P0 | A chi sono intestati gli account (dominio, store, Meta, Google)? | **Al cliente**, tu come amministratore |
| Q35 | P1 | Contratto di manutenzione, SLA, proprietà del codice | Vedi [14 §7](14-privacy-e-legale.md) |
| Q36 | P1 | Hai già un provider VPS o un password manager condiviso? | Hetzner + Bitwarden/1Password |
| Q37 | P1 | Consulente privacy e commercialista di riferimento? | Necessari per [14](14-privacy-e-legale.md) |
| Q38 | P2 | Si vuole riusare la piattaforma per altri saloni in futuro? | Se sì, ADR su multi-tenancy **prima** di F1 |

## Emerse dalla revisione del piano

| # | Pri | Domanda | Proposta / default |
|---|-----|---------|--------------------|
| Q39 | P1 | Capita che una persona prenoti per altri (figli, genitori) o per più persone insieme? | Sì: profili multipli per contatto (BOOK-18); gruppi a mano (BOOK-17) |
| Q40 | P1 | Arturo vuole modificare da solo i testi del sito (storia, manifesto) o bastano listino e galleria? | Listino e galleria dal pannello, testi nel repo |
| Q41 | P1 | Arturo registra allergie o patch test? Se sì, dove? | Campo dedicato con consenso esplicito, o niente (vedi [14 §2](14-privacy-e-legale.md)) |
| Q42 | P1 | Quale assistente AI userebbe con l'MCP, e con quale piano (consumer o business)? | Piano con termini commerciali/DPA ([14 §1](14-privacy-e-legale.md)) |
