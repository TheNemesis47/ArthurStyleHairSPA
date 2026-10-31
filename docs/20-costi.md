# 20 — Costi (stime)

Stato: `bozza` · ⚠️ Tutti i prezzi sono **indicativi** e vanno verificati sui listini al momento dell'acquisto (cambiano spesso, IVA esclusa salvo diversa indicazione).

## Una tantum

| Voce | Stima | Note |
|------|-------|------|
| Google Play Console (organization) | ~25 USD | Una volta sola |
| D-U-N-S | Gratuito (standard) | Esistono canali a pagamento più rapidi: non necessari |
| Shooting fotografico | Da preventivare ❓ | Fortemente consigliato |
| Consulenza privacy/legale (informative, DPA, registro) | Da preventivare ❓ | Necessaria |
| Pentest esterno (facoltativo) | Da preventivare | In alternativa: audit interno con le skill di [03](03-skill-e-workflow-agenti.md) |
| Registrazione marchio UE (facoltativo) | Tasse EUIPO + eventuale consulente | Prima di Malta |

## Ricorrenti

| Voce | Stima mensile | Note |
|------|---------------|------|
| VPS produzione (4 vCPU / 8 GB) | ~10–30 € | Dipende dal provider |
| VPS staging (2 vCPU / 4 GB) | ~5–10 € | Può essere spenta quando non serve |
| Object storage per i backup (altro provider) | ~1–6 € | Pochi GB |
| Dominio(i) | ~2–5 € (equivalente annuo / 12) | `.com` + `.it` |
| Cloudflare | 0 € (piano Free) | Sufficiente all'inizio |
| Email transazionali | 0–15 € | Piani gratuiti con limiti giornalieri; dipende dal volume |
| Posta del salone (`info@`) | ~5–7 €/utente | Facoltativo |
| SMS (OTP/promemoria) | ~0,05–0,10 €/SMS in Italia | **Il costo variabile più rischioso**: tetto di spesa obbligatorio |
| WhatsApp Business API | Costo per messaggio template (variabile per paese e categoria) | Facoltativo, da valutare |
| Apple Developer Program | ~99 USD/anno (≈ 8 €/mese) | Obbligatorio per iOS |
| Expo EAS | 0 € (piano Free) → piani a pagamento se servono più build/update | Si possono fare build locali |
| Sentry / errori | 0 € (piano free) o GlitchTip self-hosted | |
| Uptime esterno | 0 € (piani free) | |
| Stripe (se attivato) | Commissioni per transazione | Solo F7 |
| **Totale base indicativo** | **~35–80 €/mese** | Esclusi SMS/WhatsApp variabili, consulenze e manutenzione |

## Costo del tuo lavoro

Va definito a parte nel contratto (sviluppo per fasi + manutenzione mensile). Ricorda di includere: upgrade annuale
dell'app, aggiornamenti di sicurezza, monitoraggio, gestione degli incidenti, piccole modifiche, supporto ad Arturo.
