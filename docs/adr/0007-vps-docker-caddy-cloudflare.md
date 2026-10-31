# ADR-0007 — VPS UE con Docker Compose, Caddy e Cloudflare

Stato: Proposto · Data: 2026-10-31

## Contesto
Requisito: hosting su VPS. Traffico modesto (un salone), ma sicurezza, backup e continuità sono importanti. Lo gestisce una persona sola.

## Decisione
- VPS in **UE** (Hetzner o Aruba), Ubuntu 24.04 LTS, provisioning **Ansible** idempotente.
- **Docker Compose** con container hardened (non-root, read-only, `cap_drop: ALL`), reti separate, Postgres non esposto.
- **Caddy** come reverse proxy (TLS, header di sicurezza). **Cloudflare** davanti (DNS, proxy, WAF, Turnstile), con
  origine raggiungibile solo da Cloudflare (Authenticated Origin Pulls o Tunnel). SSH solo via **Tailscale**.
- Backup **pgBackRest/WAL-G** cifrati su object storage di **un altro provider** UE, con object lock; restore test mensile.
- Staging su una VPS separata.

## Alternative
- **Kubernetes / k3s**: sproporzionato.
- **PaaS (Vercel, Railway, Fly)**: più semplice, ma requisito VPS, costi meno prevedibili e dati sparsi.
- **Coolify/Dokploy**: comodi, ma un pannello in più da proteggere e aggiornare. Rivalutabili.
- **Traefik/Nginx**: validi; Caddy vince per semplicità e HTTPS automatico.

## Conseguenze
- ✅ Costi bassi e prevedibili, controllo totale, ricostruzione in < 2 h.
- ⚠️ Punto singolo di guasto (rischio R07, accettato con mitigazioni).
- ⚠️ La manutenzione del sistema operativo è nostra: aggiornamenti automatici + monitoraggio.
