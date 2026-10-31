# 21 — Dati mock (listino, orari, sede)

Stato: `mock` — **dati inventati ma realistici**, da sostituire con quelli veri a lavoro finito (Q09).
Servono per: seed del database (F1), golden test del motore, design e contenuti della vetrina (F3a).
Il blocco YAML in fondo è la **fonte** per il seed: le tabelle sono la versione leggibile.

> Prezzi indicativi per un salone del centro di Firenze, IVA inclusa. Le durate seguono il modello a **fasi**:
> ● operatore occupato · ○ **tempo di posa** (operatore libero, poltrona occupata).

## Sede

| Campo | Valore mock |
|-------|-------------|
| Organizzazione | `arthur-style` — Arthur Style |
| Sede | `firenze` — Arthur Style · Hair Spa Firenze |
| Indirizzo | ❓ Q44 (Google: Via Sant'Egidio 5, 50121 Firenze) |
| Telefono / WhatsApp | +39 353 491 8255 / +39 331 754 5064 |
| Fuso / valuta / IVA | Europe/Rome · EUR · 22 % |
| Orari | **mar–ven 09:00–19:00 · sab 09:00–18:00 · dom–lun chiuso**; ultimo inizio 30' prima della chiusura |
| Seconda sede (bozza) | `malta` — stato `draft`, Europe/Malta, EUR, 18 % ⚠️, solo Arturo, indirizzo da definire |

## Risorse (mock, Q07/Q08)

| Risorsa | Tipo | Orari |
|---------|------|-------|
| Arturo | operatore (owner) | come il salone |
| Collaboratore 1 | operatore | mar–sab come il salone (placeholder: numero e nomi reali da Q07) |
| Poltrona 1–3 | postazione, pool "Poltrone" | — |
| Lavatesta 1–2 | postazione, pool "Lavatesta" | — |

## Policy di prenotazione (decisioni del cliente)

| Regola | Valore | Fonte |
|--------|--------|-------|
| Preavviso minimo | 3 h | Q14 |
| Orizzonte | 35 giorni | Q15/Q46 (da confermare) |
| Disdetta/spostamento gratis | fino a 4 giorni prima | Q16 |
| Verifica | OTP email (sempre, senza login) | Q17 |
| Promemoria | push 24 h e 2 h (app) · email 24 h (senza app) | Q19 |
| Scelta operatore | no (assegnazione automatica) | Q21 |
| Granularità slot | 15' | default |
| Hold | 10' | default |
| Max prenotazioni future per cliente | 3 | default |

## Listino mock

| Categoria | Servizio | Prezzo | Fasi | Durata cliente | Online |
|-----------|----------|--------|------|----------------|--------|
| Taglio e piega | Piega capelli corti | 25 € | ● 10' lavaggio · ● 30' piega | 40' | sì |
| Taglio e piega | Piega capelli medi/lunghi | da 32 € | ● 10' lavaggio · ● 40' piega | 50' | sì |
| Taglio e piega | Taglio + piega | da 55 € | ● 10' lavaggio · ● 25' taglio · ● 30' piega | 1 h 05' | sì |
| Taglio e piega | Taglio uomo | 25 € | ● 10' lavaggio · ● 25' taglio | 35' | sì |
| Colore | Colore radici + piega | da 65 € | ● 25' applicazione · ○ 35' posa · ● 10' lavaggio · ● 35' piega | 1 h 45' | sì |
| Colore | Colore completo + piega | da 80 € | ● 35' applicazione · ○ 35' posa · ● 10' lavaggio · ● 40' piega | 2 h | sì |
| Colore | Balayage / schiariture + piega | da 140 € | ● 60' applicazione · ○ 40' posa · ● 20' tonalizzazione e lavaggio · ● 40' piega | 2 h 40' | sì |
| Colore | Gloss tonalizzante | 35 € | ● 10' applicazione · ○ 20' posa · ● 10' lavaggio | 40' | sì (in aggiunta) |
| Hair Spa | Trattamento ristrutturante | 30 € | ● 10' applicazione · ○ 20' posa · ● 10' risciacquo | 40' | sì (in aggiunta) |
| Hair Spa | Rituale Hair Spa (massaggio cute + trattamento + piega) | 60 € | ● 15' massaggio · ● 10' applicazione · ○ 20' posa · ● 10' lavaggio · ● 30' piega | 1 h 25' | sì |
| Hair Spa | Lisciante alla cheratina | da 180 € | ● 45' applicazione · ○ 30' posa · ● 75' piastra e finitura | 2 h 30' | **no** (su consulenza, Q12) |
| Acconciature | Acconciatura evento | da 70 € | ● 60' | 1 h | sì |
| Acconciature | Sposa (prova + giorno) | su preventivo | — | — | **no** (contatto WhatsApp) |
| Consulenza | Consulenza colore | gratuita | ● 15' | 15' | sì |

Buffer dopo i servizi di colore: 5' (riordino postazione). I prezzi "da" mostrano l'etichetta *a partire da*.

## Seed (YAML)

```yaml
organization: { slug: arthur-style, name: Arthur Style }
locations:
  - slug: firenze
    name: Arthur Style · Hair Spa Firenze
    country_code: IT
    timezone: Europe/Rome
    currency: EUR
    vat_rate_bp: 2200
    status: active
    phone_e164: "+393534918255"
    whatsapp_e164: "+393317545064"
    hours:            # ISO weekday: 1 = lunedì
      - { weekday: 2, open: "09:00", close: "19:00", last_start: "18:30" }
      - { weekday: 3, open: "09:00", close: "19:00", last_start: "18:30" }
      - { weekday: 4, open: "09:00", close: "19:00", last_start: "18:30" }
      - { weekday: 5, open: "09:00", close: "19:00", last_start: "18:30" }
      - { weekday: 6, open: "09:00", close: "18:00", last_start: "17:30" }
    policy: { min_notice_min: 180, max_advance_days: 35, cancel_window_min: 5760, reschedule_window_min: 5760,
              require_contact_otp: always, reminder_offsets_min: [1440, 120], slot_granularity_min: 15,
              hold_ttl_sec: 600, max_future_bookings: 3 }
    resources:
      staff: [ { name: Arturo, role: owner }, { name: Collaboratore 1, role: staff } ]
      pools: { Poltrone: [Poltrona 1, Poltrona 2, Poltrona 3], Lavatesta: [Lavatesta 1, Lavatesta 2] }
  - slug: malta
    name: Arthur Style · Hair Spa Malta
    country_code: MT
    timezone: Europe/Malta
    currency: EUR
    vat_rate_bp: 1800      # ⚠️ da verificare
    status: draft
    resources: { staff: [ { name: Arturo, role: owner } ] }

# step: [durata_min, staff_busy, pool]   (pool: P = Poltrone, L = Lavatesta)
services:
  - { slug: piega-corti,        cat: taglio-piega,  it: "Piega capelli corti",            en: "Blow-dry, short hair",            price: 2500,  from: false, steps: [[10,true,L],[30,true,P]] }
  - { slug: piega-lunghi,       cat: taglio-piega,  it: "Piega capelli medi/lunghi",      en: "Blow-dry, medium/long hair",      price: 3200,  from: true,  steps: [[10,true,L],[40,true,P]] }
  - { slug: taglio-piega,       cat: taglio-piega,  it: "Taglio + piega",                 en: "Cut & blow-dry",                  price: 5500,  from: true,  steps: [[10,true,L],[25,true,P],[30,true,P]] }
  - { slug: taglio-uomo,        cat: taglio-piega,  it: "Taglio uomo",                    en: "Men's cut",                       price: 2500,  from: false, steps: [[10,true,L],[25,true,P]] }
  - { slug: colore-radici,      cat: colore,        it: "Colore radici + piega",          en: "Root colour & blow-dry",          price: 6500,  from: true,  buffer_after: 5, steps: [[25,true,P],[35,false,P],[10,true,L],[35,true,P]] }
  - { slug: colore-completo,    cat: colore,        it: "Colore completo + piega",        en: "Full colour & blow-dry",          price: 8000,  from: true,  buffer_after: 5, steps: [[35,true,P],[35,false,P],[10,true,L],[40,true,P]] }
  - { slug: balayage,           cat: colore,        it: "Balayage / schiariture + piega", en: "Balayage / highlights & blow-dry", price: 14000, from: true,  buffer_after: 5, steps: [[60,true,P],[40,false,P],[20,true,L],[40,true,P]] }
  - { slug: gloss,              cat: colore,        it: "Gloss tonalizzante",             en: "Toning gloss",                    price: 3500,  from: false, steps: [[10,true,P],[20,false,P],[10,true,L]] }
  - { slug: ristrutturante,     cat: hair-spa,      it: "Trattamento ristrutturante",     en: "Repair treatment",                price: 3000,  from: false, steps: [[10,true,P],[20,false,P],[10,true,L]] }
  - { slug: rituale-hair-spa,   cat: hair-spa,      it: "Rituale Hair Spa",               en: "Hair Spa ritual",                 price: 6000,  from: false, steps: [[15,true,L],[10,true,P],[20,false,P],[10,true,L],[30,true,P]] }
  - { slug: cheratina,          cat: hair-spa,      it: "Lisciante alla cheratina",       en: "Keratin smoothing",               price: 18000, from: true,  online: false, steps: [[45,true,P],[30,false,P],[75,true,P]] }
  - { slug: acconciatura,       cat: acconciature,  it: "Acconciatura evento",            en: "Event styling",                   price: 7000,  from: true,  steps: [[60,true,P]] }
  - { slug: consulenza-colore,  cat: consulenza,    it: "Consulenza colore",              en: "Colour consultation",             price: 0,     from: false, steps: [[15,true,P]] }
```
