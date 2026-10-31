# CLAUDE.md

@AGENTS.md

## Specifico per Claude Code

- **Plugin e skill:** i marketplace sono dichiarati in `.claude/settings.json`. Si abilitano i plugin **dopo averli letti**
  (comandi in [docs/03 §2](docs/03-skill-e-workflow-agenti.md)). Dopo `mattpocock-skills`, esegui `/setup-matt-pocock-skills`
  una volta (issue tracker: GitHub; documenti: `docs/`).
- **Prima di ogni PR** che tocca auth, API, DB, MCP o infrastruttura: `/security-review` e `/code-review`.
- **Lavori lunghi:** usa i task per tracciare i passi; a fine sessione usa `handoff` se un altro agente deve continuare.
- **Fonti:** per framework e regole esterne (Expo, Next.js, Better Auth, spec MCP, store) verifica la documentazione
  ufficiale della versione installata prima di scrivere codice (`source-driven-development`).
- **Modello e identità:** non inserire identificativi di modelli AI nei commit, nel codice o nella documentazione.
