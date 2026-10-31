# 20 — Costi (stime)

Stato: `in revisione` (31/10/2026) · ⚠️ Tutti i prezzi sono **indicativi** e vanno verificati sui listini al momento dell'acquisto (cambiano spesso, IVA esclusa salvo diversa indicazione).

## Una tantum

| Voce | Stima | Note |
|------|-------|------|
| Google Play Console (organization) | ~25 USD | Una volta sola |
| D-U-N-S | Gratuito (standard) | Esistono canali a pagamento più rapidi: non necessari |
| Shooting fotografico | Da preventivare ❓ | Fortemente consigliato |
| Consulenza privacy/legale (informative, DPA, registro) | Da preventivare ❓ | Necessaria |
| Pentest esterno (facoltativo) | Da preventivare | In alternativa: audit interno con le skill di [03](03-skill-e-workflow-agenti.md) |
| Registrazione marchio UE (facoltativo) | Tasse EUIPO + eventuale consulente | Prima di Malta |

## Ricorrenti (con le decisioni del 31/10/2026)

| Voce | Stima mensile | Note |
|------|---------------|------|
| VPS (la tua, già esistente) | quota ~5–15 € | Produzione + staging isolato sulla stessa macchina |
| Object storage per i backup (altro provider, UE) | ~1–5 € | Pochi GB |
| Dominio `.com` | ~1–2 € (annuo / 12) | Pagato dal cliente |
| Cloudflare | 0 € (piano Free) | Sufficiente |
| Email transazionali | 0 € entro i piani gratuiti | OTP + conferme + promemoria a chi non ha l'app |
| Push (Expo) | 0 € | Canale principale dei promemoria |
| Apple Developer Program | ~99 USD/anno | Pagato dal cliente |
| Expo EAS | 0 € (piano Free) o build locali | |
| Errori e uptime | 0 € (piani free) | |
| ~~SMS / WhatsApp Business API~~ | — | **Esclusi** (Q19, Q24): WhatsApp resta manuale |
| Stripe (solo se in futuro c'è la caparra) | commissioni | F7 |

## Il preventivo: 1.500 € + 40 €/mese (Q32) — verifica di sostenibilità

### Chi paga cosa (proposta da mettere nel contratto)

Gli account sono **intestati al cliente** (Q34), quindi i costi di terzi li paga **direttamente lui** e restano fuori dal canone:

| Voce | Chi paga | Importo indicativo |
|------|----------|--------------------|
| Dominio `.com` | Cliente | ~10–20 €/anno |
| Apple Developer Program | Cliente | ~99 USD/anno |
| Google Play Console | Cliente | ~25 USD una tantum |
| Posta del salone (se serve) | Cliente | variabile |
| Consulente privacy, commercialista, eventuale shooting | Cliente | a parte |

### Cosa copre il canone di 40 €/mese

| Voce | Stima mensile |
|------|---------------|
| Quota della tua VPS dedicata al progetto | ~5–15 € |
| Object storage per i backup (altro provider, UE) | ~1–5 € |
| Email transazionali (~1.000/mese: OTP, conferme, promemoria a chi non ha l'app) | 0 € con i piani gratuiti dei principali provider ⚠️ verificare i limiti giornalieri |
| Push (Expo Push Service) | 0 € |
| Monitoraggio esterno, errori (piani free) | 0 € |
| **Costi vivi** | **~6–20 €** |
| **Margine per manutenzione** | **~20–34 €/mese** |

Con 20–34 €/mese di margine stanno dentro aggiornamenti di sicurezza, backup verificati e piccole correzioni. **Non**
ci stanno l'upgrade annuale dell'app (Expo SDK, target API Android: giorni di lavoro), nuove funzioni, contenuti e
supporto continuativo. Proposta: nel contratto, upgrade annuale e nuove funzioni **a preventivo**.

### Il prezzo una tantum

Con le stime della [roadmap](16-roadmap.md) (circa 13–15 settimane per tutto il perimetro: vetrina, motore, pannello,
app iOS/Android, MCP) **1.500 € corrispondono a pochi euro l'ora**. È una tua scelta commerciale. Due modi per renderla sostenibile:

| Opzione | Contenuto per 1.500 € | Resto |
|---------|----------------------|-------|
| **A — consigliata** | Vetrina IT/EN + prenotazione web + pannello (PWA) + email/OTP + hosting e backup | App iOS/Android e MCP come **fase 2** con preventivo separato |
| B — tutto incluso | Tutto il perimetro attuale | Esclusioni scritte nel contratto: F7 (lista d'attesa, recensioni, caparra, gift card), contenuti e foto, cicli di revisione degli store oltre i primi 2, upgrade annuali |

In entrambi i casi conviene scrivere: perimetro (questi documenti), collaudo, proprietà del codice (Q35), SLA della
manutenzione e cosa succede se il rapporto si interrompe (consegna di repo, backup e accessi).
