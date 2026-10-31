# 10 — App mobile (iOS + Android)

Stato: `bozza` · App: `apps/mobile` (Expo, React Native) · Skill: `expo-*`, `eas-app-stores` · Decisione: [ADR-0004](adr/0004-app-mobile-expo.md)

## 1. Perché un'app (e il rischio che Apple la rifiuti)

Un'app che è solo "il sito in una scatola" viene **rifiutata** da Apple (App Review Guideline **4.2 — Minimum
Functionality**). La nostra deve offrire un valore nativo concreto:

- notifiche **push** (conferma, promemoria, variazioni, "si è liberato un posto");
- **"riprenota il solito"** in un tap, con storico e preferiti;
- integrazione con il **calendario** del telefono (`expo-calendar`) e, in futuro, Wallet;
- login persistente sicuro, deep link dalle email (Universal/App Links);
- modalità **staff** per Arturo (agenda di oggi + push sulle nuove prenotazioni).

> 🔒 La linea guida **4.2.6** rifiuta le app generate da template se non sono pubblicate dal titolare dei contenuti.
> L'account Apple Developer va quindi **intestato all'attività di Arturo** (account *Organization*), con te come membro del team.
> ⚠️ DA VERIFICARE al momento della pubblicazione: le linee guida cambiano.

## 2. Schermate

| Tab | Schermate |
|-----|-----------|
| **Home** | Prossimo appuntamento (countdown, indicazioni, "aggiungi al calendario"), "Riprenota il solito", novità/Instagram |
| **Prenota** | Stesso flusso del web: servizi → operatore → data e ora → conferma (logica e validazioni da `packages/contracts`) |
| **Appuntamenti** | Futuri e passati; sposta, disdici, ripeti |
| **Salone** | Mappa, orari, chiama, WhatsApp, Instagram, Malta |
| **Profilo** | Dati, lingua, notifiche, consensi, privacy, **elimina account**, versione |
| *(staff)* **Agenda** | Oggi e domani per operatore, arrivato o no-show, push sulle nuove prenotazioni (ruolo `staff`/`owner`) |

Onboarding: lingua → login facoltativo (si può prenotare anche senza account) → permesso push **chiesto al momento
giusto** (dopo la prima prenotazione, non all'avvio).

## 3. Scelte tecniche

| Tema | Scelta |
|------|--------|
| Navigazione | Expo Router (file-based), tab native |
| Dati | TanStack Query + client tipizzato da `packages/contracts`; cache persistente del prossimo appuntamento |
| Auth | Better Auth Expo client; token in **`expo-secure-store`** (Keychain/Keystore), mai in AsyncStorage |
| Push | `expo-notifications` → Expo Push Service → APNs/FCM; token registrati su `/v1/me/push-tokens`, rimossi al logout |
| Deep link | Universal Links (iOS, file `apple-app-site-association`) e App Links (Android, `assetlinks.json`) serviti da `www.<dominio>/.well-known/` |
| i18n | `expo-localization` + `packages/i18n` |
| UI | Componenti nativi (skill `expo-native-ui`, `expo-ui`), token di design condivisi con il sito (colori, tipografia) |
| Animazioni | Reanimated + Gesture Handler (skill `expo-animation`). GSAP **non** si usa in RN |
| Build | **EAS Build** (piano gratuito con limiti) oppure build locali; profili `development`, `preview`, `production` |
| Aggiornamenti OTA | **EAS Update** per correzioni JS urgenti (rispettando le regole degli store: niente cambi di funzionalità sostanziali via OTA) |
| Versione minima | All'avvio legge `/v1/meta/app-config` e, se è troppo vecchia, propone l'aggiornamento obbligatorio |
| Crash/errori | Sentry (React Native), con PII rimosse |
| Test E2E | **Maestro** (flussi: prenota, disdici, login, elimina account) su emulatori in CI |

### Accessibilità

VoiceOver e TalkBack su tutti i flussi critici: etichette, ordine di focus, testo dinamico (Dynamic Type / font
scaling) fino al 200 % senza testo tagliato, contrasto AA, target tattili ≥ 44 pt.

### Anti-abuso nell'app

Turnstile **non** esiste come widget nativo. Nell'app quindi:

- l'hold richiede un utente **loggato** (OTP verificato), con rate limit per account;
- in aggiunta, valutare **App Attest** (iOS) e **Play Integrity** (Android) per verificare che le richieste arrivino
  dall'app autentica (fase 2, se si vedono abusi).

### Sicurezza mobile 🔒 (OWASP MASVS)

- Nessun segreto nell'app: chiunque può decompilare il bundle JS. Le chiavi pubbliche (es. Turnstile site key) vanno bene, le chiavi dei provider **mai**.
- TLS ovunque (ATS iOS attivo, `cleartextTrafficPermitted=false` su Android).
- Token in Secure Store, logout = revoca server-side + pulizia locale.
- Deep link validati: il token del link di gestione si invia solo all'API, mai si logga.
- Screenshot di schermate sensibili: nessun dato sensibile a parte nome e orario, quindi nessun blocco necessario.
- Valutare il *certificate pinning*? **No** nella v1: Cloudflare ruota i certificati e il rischio di bloccare tutti gli utenti supera il beneficio.

## 4. Pubblicazione sugli store — checklist

### Prerequisiti (da avviare in **Fase 0**: hanno tempi lunghi)

| Passo | Dettaglio | Tempi indicativi |
|-------|-----------|------------------|
| **D-U-N-S number** dell'attività | Richiesto sia da Apple sia da Google per gli account *organization* | ⚠️ da giorni a ~30 giorni |
| Apple Developer Program (Organization) | ~99 USD/anno, intestato all'attività | Dopo il D-U-N-S, giorni |
| Google Play Console (Organization) | ~25 USD una tantum | Dopo il D-U-N-S, giorni |
| Dominio + email aziendale | Servono per gli account e per la privacy policy | — |

> Con un account Google Play **personale** creato dopo novembre 2023 servirebbe un **closed test con almeno 12 tester per
> 14 giorni consecutivi** prima della produzione. Gli account *organization* ne sono esenti secondo varie fonti
> (⚠️ DA VERIFICARE sulla pagina ufficiale Google). Un motivo in più per intestare l'account all'attività.

### Materiale per gli store

- Nome: "Arthur Style". Sottotitolo e descrizione IT/EN, parole chiave.
- Icona, splash, screenshot (iPhone 6,9", iPad se supportato, telefoni Android), video facoltativo.
- **Privacy policy URL** e **pagina di cancellazione account via web** (Google Play la richiede anche fuori dall'app).
- Apple: *App Privacy* ("etichette nutrizionali"), *Privacy Manifest* (`PrivacyInfo.xcprivacy`, Expo lo genera, va verificato), classificazione per età.
- Google: modulo **Data safety**, target API level aggiornato (Google lo alza ogni anno: va pianificato con `expo-upgrade`), classificazione dei contenuti.
- **Account demo per la review Apple** (con dati finti in un ambiente di demo o in una sede "demo" nascosta), istruzioni per il revisore.
- Se in futuro si aggiunge il login con Google o Facebook, va offerta anche un'opzione equivalente privacy-first
  (Sign in with Apple), linea guida 4.8. Con OTP via email o SMS il problema non si pone.

### Ciclo di rilascio

`preview` (TestFlight + Google internal testing) → test con Arturo e 5–10 clienti fidati → `production` con rilascio
graduale (Google: rollout percentuale; Apple: phased release). Ogni anno: upgrade dell'SDK Expo (skill `expo-upgrade`)
pianificato in roadmap.
