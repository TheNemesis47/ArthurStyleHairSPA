# CLAUDE.md

@AGENTS.md

## Specifico per Claude Code

- **Plugin e skill:** installati e revisionati il 31/10/2026 (plugin in `.claude/settings.json`, skill copiate in
  `.claude/skills/` con origine e commit in `SOURCES.md`). Dettagli e matrice d'uso: [docs/03](docs/03-skill-e-workflow-agenti.md).
  Un plugin nuovo o un aggiornamento si **legge prima** di abilitarlo (hook, MCP, script). Se `/setup-matt-pocock-skills`
  non è ancora stato eseguito, eseguilo una volta (issue tracker: GitHub; documenti: `docs/`).
- **Prima di ogni PR** che tocca auth, API, DB, MCP o infrastruttura: `/security-review` e `/code-review`.
- **Lavori lunghi:** usa i task per tracciare i passi; a fine sessione usa `handoff` se un altro agente deve continuare.
- **Fonti:** per framework e regole esterne (Expo, Next.js, Better Auth, spec MCP, store) verifica la documentazione
  ufficiale della versione installata prima di scrivere codice (`source-driven-development`).
- **Modello e identità:** non inserire identificativi di modelli AI nei commit, nel codice o nella documentazione.
