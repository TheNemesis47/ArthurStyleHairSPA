# 18 — Registro dei rischi

Stato: `aperto` · Revisione: a ogni fine fase (skill `retro`)

Probabilità (P) e impatto (I) da 1 a 5. Punteggio = P × I. ≥ 12 = **alto**.

| # | Rischio | P | I | Punt. | Mitigazione | Responsabile |
|---|---------|---|---|-------|-------------|--------------|
| R01 | **Perimetro enorme** (sito + prenotazioni + pannello + 2 app + MCP) per un solo sviluppatore | 4 | 4 | **16** | Fasi con milestone utilizzabili (M1 pannello prima del sito), MVP rigoroso, "Won't" espliciti, skill per accelerare ma non per saltare i test | Tu |
| R02 | Doppia prenotazione in produzione | 2 | 5 | 10 | Vincolo `EXCLUDE` nel DB, test di concorrenza, test di proprietà, runbook | Tu |
| R03 | Apple rifiuta l'app (4.2 / 4.2.6) | 3 | 3 | 9 | Funzioni native vere, account intestato al cliente, account demo, note per il revisore | Tu |
| R04 | D-U-N-S e account store in ritardo | 3 | 3 | 9 | Avvio in F0, l'app è in F5 (margine di settimane) | Arturo + tu |
| R05 | Hero 3D lenta sui telefoni → abbandoni, SEO peggiore | 3 | 3 | 9 | Prototipo su dispositivo reale prima del design definitivo, budget bloccanti in CI, fallback | Tu |
| R06 | I clienti continuano a prenotare via WhatsApp e telefono | 4 | 2 | 8 | Il pannello rende veloce l'inserimento manuale; link "Prenota" ovunque; promemoria che educano | Arturo |
| R07 | VPS singola: guasto = sito e prenotazioni giù | 2 | 4 | 8 | Backup offsite, rebuild in < 2 h con Ansible, pagina di stato esterna, snapshot del provider | Tu |
| R08 | Perdita di dati (errore umano, ransomware) | 2 | 5 | 10 | Backup immutabili su un altro provider, PITR, restore test mensile, minimo privilegio | Tu |
| R09 | Compromissione dell'account owner (telefono perso, phishing) | 2 | 5 | 10 | Passkey, MFA, step-up, avvisi di login, break-glass, revoca delle sessioni | Tu + Arturo |
| R10 | Abuso del flusso pubblico (bot, slot squatting, SMS pumping) | 3 | 3 | 9 | Turnstile, rate limit, limiti per contatto, tetto di spesa SMS, alert | Tu |
| R11 | Agente AI che fa danni (prompt injection, errori) | 2 | 4 | 8 | Due fasi, limiti, audit, kill switch, nessun tool generico | Tu |
| R12 | Cambi delle API di terze parti (Instagram: la Basic Display è già stata chiusa; regole degli store; spec MCP) | 4 | 2 | 8 | Adattatori isolati, fallback dalla cache, verifica delle fonti a ogni fase | Tu |
| R13 | Supply chain npm compromessa | 2 | 4 | 8 | `minimumReleaseAge`, lockfile, allowlist dei build script, SBOM, scansioni, Renovate con ritardo | Tu |
| R14 | Non conformità GDPR (dati sanitari nelle note, foto senza liberatoria, marketing senza consenso) | 3 | 4 | **12** | Avvisi nei campi, liberatorie digitali, consensi tracciati, revisione del consulente | Arturo + consulente |
| R15 | Upgrade annuali (Expo SDK, target API Android, Next.js) trascurati → app rimossa o non aggiornabile | 3 | 3 | 9 | Upgrade in calendario e nel contratto di manutenzione | Tu |
| R16 | Trasferimento a Malta prima del previsto | 2 | 3 | 6 | Multi-sede dal giorno 1 (ADR-0008), contenuti EN, playbook Malta | Tu |
| R17 | Costi ricorrenti più alti del previsto (SMS/WhatsApp, EAS) | 3 | 2 | 6 | Email + push come default, SMS solo dove serve, tetti di spesa, monitoraggio dei costi | Tu |
| R18 | Rapporto con il cliente che si interrompe → account e dati "ostaggio" | 2 | 4 | 8 | Account intestati al cliente, exit plan nel contratto, documentazione completa | Tu + Arturo |
| R19 | Dipendenza da una persona sola (bus factor = 1) | 3 | 4 | **12** | Documentazione, runbook, ADR, infrastruttura come codice, `handoff`: un altro sviluppatore deve poter subentrare in un giorno | Tu |
| R20 | Go-live durante un periodo di punta (Natale, cerimonie) | 2 | 3 | 6 | Go-live in un periodo tranquillo (gennaio), 2 settimane di uso in parallelo (M1) | Tu + Arturo |
