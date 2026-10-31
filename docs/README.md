# Documentazione — indice e regole di manutenzione

## Ordine di lettura consigliato

1. **Cosa e perché:** [01 Brief](01-brief-cliente.md) → [02 Requisiti](02-requisiti.md) → [17 Domande aperte](17-domande-aperte.md)
2. **Come lavoriamo:** [03 Skill e workflow](03-skill-e-workflow-agenti.md) → [../CONSTRAINTS.md](../CONSTRAINTS.md) → [15 Qualità e CI](15-qualita-test-ci.md)
3. **Come è fatto:** [04 Architettura](04-architettura.md) → [05 Modello dati](05-modello-dati.md) → [06 Motore prenotazioni](06-motore-prenotazioni.md) → [07 API](07-api.md)
4. **Prodotti:** [08 Sito](08-sito-vetrina.md) · [09 Pannello](09-pannello-gestione.md) · [10 App](10-app-mobile.md) · [11 MCP](11-mcp-agenti.md)
5. **In produzione:** [12 Sicurezza](12-sicurezza.md) · [13 VPS](13-infrastruttura-vps.md) · [14 Privacy e legale](14-privacy-e-legale.md)
6. **Pianificazione:** [16 Roadmap](16-roadmap.md) · [18 Rischi](18-rischi.md) · [20 Costi](20-costi.md) · [21 Dati mock](21-dati-mock.md)
8. **Brand:** [../brand/](../brand/README.md) (logo vettoriale, palette, token, font, foto)
7. **Riferimenti:** [19 Open source](19-riferimenti-open-source.md) · [Glossario](glossario.md) · [ADR](adr/README.md) · [Ricerche e verifiche](research/)

## Convenzioni

- **Lingua:** documentazione in italiano. Codice, identificatori, nomi di tabelle e commit in inglese.
  I termini di dominio si traducono **sempre** con il [glossario](glossario.md) (es. *tempo di posa* ↔ `processing`).
- **Stato di un documento:** ogni documento ha in testa una riga `Stato:` con uno di questi valori: `bozza` · `in revisione` · `approvato` · `superato da …`.
- **Decisioni:** una scelta architetturale non banale si registra come ADR in `docs/adr/`, con numerazione progressiva e senza riscrivere quelli vecchi.
  Se una decisione cambia si crea un nuovo ADR che *sostituisce* il precedente.
- **Fonti:** quando un documento dipende da regole esterne (store, GDPR, spec MCP, prezzi), riporta la fonte e la data di verifica.
  Queste regole cambiano: vanno **riverificate** al momento di implementare. Lo prescrive la skill `source-driven-development`.
- **Marcatori:**
  - `⚠️ DA VERIFICARE`: informazione non confermata da fonte primaria.
  - `❓ DOMANDA`: dipende da una risposta del cliente (vedi [17](17-domande-aperte.md)).
  - `🔒`: requisito di sicurezza non negoziabile.

## Quando aggiornare cosa

| Evento | Documenti da toccare |
|--------|----------------------|
| Nuovo requisito dal cliente | 02, 16, eventualmente 17 (chiudere la domanda) |
| Cambia lo schema DB | 05, migrazione, eventualmente un ADR |
| Nuovo endpoint | 07 + test di contratto |
| Nuovo tool MCP | 11 + tabella scope + test di autorizzazione |
| Nuovo fornitore esterno (email, SMS, ecc.) | 14 (sub-responsabili), 20 (costi), 13 (segreti) |
| Incidente in produzione | 13 (runbook), 18 (rischi), post-mortem in `docs/postmortem/` |
