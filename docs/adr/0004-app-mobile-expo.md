# ADR-0004 — App mobile con Expo (React Native)

Stato: Proposto · Data: 2026-10-31

## Contesto
Servono app iOS e Android con prenotazione, push, calendario e deep link. Lo sviluppatore è uno solo e il resto dello stack è TypeScript/React.

## Decisione
**Expo** (React Native, Continuous Native Generation) con Expo Router, EAS Build/Submit/Update, `expo-notifications`,
`expo-secure-store`, `expo-calendar`. Contratti e i18n condivisi con il web. Skill ufficiali `expo/skills`.

## Alternative
- **Flutter**: ottimo, ma Dart = un linguaggio e un ecosistema in più, niente condivisione con il web.
- **Nativo (Swift + Kotlin)**: massima qualità, doppio lavoro.
- **PWA soltanto**: niente presenza sugli store, push iOS limitate, meno fiducia del cliente.
- **Capacitor (web incapsulato)**: rischio di rifiuto Apple 4.2 ("sito in una scatola").

## Conseguenze
- ✅ Un solo codice, aggiornamenti OTA per i fix JS.
- ⚠️ Upgrade annuale dell'SDK e del target API Android: va pianificato (rischio R15).
- ⚠️ Alcune funzioni EAS sono a pagamento oltre il piano gratuito (build locali come alternativa).
