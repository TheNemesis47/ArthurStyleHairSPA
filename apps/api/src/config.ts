import { z } from 'zod';

const commaList = z
  .string()
  .default('')
  .transform((s) =>
    s
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o !== ''),
  );

/** Chiavi di test pubbliche di Turnstile (passano sempre o falliscono sempre): mai in produzione. */
const TURNSTILE_TEST_SECRET = /^[123]x0{31}AA$/;
/** Trasporti email ammessi solo fuori produzione (oggi l'unico disponibile). */
const DEV_ONLY_TRANSPORTS: readonly string[] = ['dev-file'];

/** Configurazione dall'ambiente, validata all'avvio: un valore mancante o sbagliato ferma il processo (fail fast). */
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  /** Organizzazione servita dalle rotte pubbliche (ADR-0009: oggi una sola). */
  ORGANIZATION_SLUG: z.string().regex(/^[a-z0-9-]{2,40}$/),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3200),
  /** Origine pubblica dell'API: base degli URI `type` dei problemi RFC 9457. */
  PUBLIC_API_ORIGIN: z.url().default('https://api.example.invalid'),
  /** Origini del sito e del pannello ammesse da CORS, separate da virgola. */
  CORS_ORIGINS: commaList,
  /** Proxy fidati (Caddy sulla stessa macchina): servono per leggere l'IP vero del client nel rate limit. */
  TRUST_PROXY: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Firma del cookie __Host-hold. Almeno 32 caratteri casuali (es. `openssl rand -base64 48`). Nessun default. */
  HOLD_COOKIE_SECRET: z.string().min(32),
  /** Chiave HMAC dei codici OTP e degli IP. Almeno 32 caratteri casuali, diversa da HOLD_COOKIE_SECRET. */
  OTP_SECRET: z.string().min(32),
  /** Segreto Cloudflare Turnstile. In sviluppo la chiave di test ufficiale 1x0000000000000000000000000000000AA. */
  TURNSTILE_SECRET: z.string().min(1),
  /** Siti da cui deve arrivare il token Turnstile (es. arthurstyle.it), separati da virgola. Vuoto = nessun controllo. */
  TURNSTILE_HOSTNAMES: commaList,
  /** Invio email: per ora solo 'dev-file' (file in MAIL_DEV_DIR). Il provider arriva con il worker. */
  MAIL_TRANSPORT: z.enum(['dev-file']),
  MAIL_DEV_DIR: z.string().default('.dev-mail'),
});
export type Config = z.infer<typeof Env>;

/** Regole che legano più variabili: in produzione niente scorciatoie di sviluppo. */
function crossChecks(c: Config): string[] {
  const bad: string[] = [];
  if (c.HOLD_COOKIE_SECRET === c.OTP_SECRET) bad.push('OTP_SECRET');
  if (c.NODE_ENV === 'production') {
    if (DEV_ONLY_TRANSPORTS.includes(c.MAIL_TRANSPORT)) bad.push('MAIL_TRANSPORT');
    if (TURNSTILE_TEST_SECRET.test(c.TURNSTILE_SECRET)) bad.push('TURNSTILE_SECRET');
    if (c.TURNSTILE_HOSTNAMES.length === 0) bad.push('TURNSTILE_HOSTNAMES');
  }
  return bad;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    // Solo i nomi delle variabili: mai i valori (potrebbero contenere segreti)
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))].join(', ');
    throw new Error(`Configurazione non valida: ${names}`);
  }
  const bad = crossChecks(parsed.data);
  if (bad.length > 0) throw new Error(`Configurazione non valida: ${bad.join(', ')}`);
  return parsed.data;
}
