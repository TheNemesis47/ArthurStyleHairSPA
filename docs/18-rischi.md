# 18 — Registro dei rischi

Stato: `aperto` · Revisione: a ogni fine fase (skill `retro`)

Probabilità (P) e impatto (I) da 1 a 5. Punteggio = P × I. ≥ 12 = **alto**.

| # | Rischio | P | I | Punt. | Mitigazione | Responsabile |
|---|---------|---|---|-------|-------------|--------------|
| R01 | **Perimetro enorme** (sito + prenotazioni + pannello + 2 app + MCP) per un solo sviluppatore, con **budget 1.500 €** | 5 | 4 | **20** | Milestone utilizzabili (M0 vetrina subito), "Won't" espliciti, opzione A del [20](20-costi.md) (app e MCP in fase 2), skill per accelerare senza saltare i test | Tu |
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
| R17 | Costi ricorrenti oltre il canone di 40 €/mese | 2 | 2 | 4 | SMS/WhatsApp esclusi, piani free per email/errori/uptime, costi di terzi pagati dal cliente | Tu |
| R18 | Rapporto con il cliente che si interrompe → account e dati "ostaggio" | 2 | 4 | 8 | Account intestati al cliente, exit plan nel contratto, documentazione completa | Tu + Arturo |
| R19 | Dipendenza da una persona sola (bus factor = 1) | 3 | 4 | **12** | Documentazione, runbook, ADR, infrastruttura come codice, `handoff`: un altro sviluppatore deve poter subentrare in un giorno | Tu |
| R20 | Go-live durante un periodo di punta (Natale, cerimonie) | 2 | 3 | 6 | Go-live in un periodo tranquillo (gennaio), 2 settimane di uso in parallelo (M1) | Tu + Arturo |
| R21 | **Doppie prenotazioni tra Treatwell e il nostro sistema** (due agende indipendenti) | 4 | 4 | **16** | Q43: al go-live chiudere la prenotazione online Treatwell o bloccarne gli slot a mano; il link "Prenota" di Google punta al nostro sito | Arturo + tu |
| R22 | Trasferimento a Malta con indirizzo, data e sorte di Firenze ignoti | 4 | 3 | **12** | Multi-sede/multi-tenant dal giorno 1, vetrina EN subito, pagina sede attivabile in un'ora, comunicazione "ci trasferiamo" pronta | Tu |
| R23 | Dati dei clienti verso un assistente AI con piano consumer | 3 | 3 | 9 | Pseudonimizzazione obbligatoria, niente contatti agli agenti, addestramento disattivato, menzione nell'informativa | Tu |
| R24 | VPS condivisa con altri progetti (risorse, sicurezza, GDPR) | 3 | 3 | 9 | Q45; reti, utenti e DB separati, limiti di risorse, data center UE, backup verso un altro provider | Tu |
| R25 | Indirizzo incoerente tra fonti (5 vs 19/19R) → SEO locale e clienti persi | 3 | 2 | 6 | Q44: correggere prima del go-live della vetrina, ovunque | Tu + Arturo |
