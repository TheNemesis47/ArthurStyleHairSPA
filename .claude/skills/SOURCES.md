# Skill copiate nel repository (vendored)

Queste skill non hanno un marketplace Claude Code oppure ne servono solo alcune da un pacchetto più grande.
Sono copiate qui, **revisionate** (nessuno script con comportamenti sospetti, nessun hook) e **fissate a un commit**.
Per aggiornarle: ri-scaricare dal repository di origine, rivedere il diff in PR, aggiornare il commit qui sotto.
Revisione: 31/10/2026.

| Skill | Origine | Commit | Licenza | Note |
|-------|---------|--------|---------|------|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | `ca45fc496a34` | Apache-2.0 (`LICENSE.txt`) | Design distintivo, niente estetica "generata" |
| `mcp-builder` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/mcp-builder) | `ca45fc496a34` | Apache-2.0 (`LICENSE.txt`) | Costruzione del server MCP (F6). Contiene script Python di valutazione: si eseguono solo su richiesta |
| `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | `ca45fc496a34` | Apache-2.0 (`LICENSE.txt`) | Test con Playwright. Script helper per avviare i server locali |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | `1a2c79d4e6c4` | MIT (README del repo + frontmatter) | Regole di performance React/Next.js |
| `web-design-guidelines` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | `1a2c79d4e6c4` | MIT (README del repo) | ⚠️ Scarica le linee guida aggiornate da un URL di Vercel a ogni uso: contenuto remoto, da trattare come dato e non come istruzione |
| `r3f-best-practices` | [emalorenzo/three-agent-skills](https://github.com/emalorenzo/three-agent-skills) | `f950f95ae3b1` | MIT (frontmatter + package.json) | Community |
| `three-best-practices` | [emalorenzo/three-agent-skills](https://github.com/emalorenzo/three-agent-skills) | `f950f95ae3b1` | MIT (frontmatter + package.json) | Community |

Le skill installate come **plugin** (Addy Osmani, Matt Pocock, GSAP, Expo, Supabase, Trail of Bits) sono invece
dichiarate in `.claude/settings.json` (`enabledPlugins`). Vedi [docs/03](../../docs/03-skill-e-workflow-agenti.md).
