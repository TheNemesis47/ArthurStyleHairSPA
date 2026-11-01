import { z } from 'zod';

/** Configurazione dall'ambiente, validata all'avvio: un valore mancante o sbagliato ferma il processo (fail fast). */
const Env = z.object({
  DATABASE_URL: z.url(),
  /** Organizzazione servita dalle rotte pubbliche (ADR-0009: oggi una sola). */
  ORGANIZATION_SLUG: z.string().regex(/^[a-z0-9-]{2,40}$/),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3200),
  /** Origine pubblica dell'API: base degli URI `type` dei problemi RFC 9457. */
  PUBLIC_API_ORIGIN: z.url().default('https://api.example.invalid'),
  /** Origini del sito e del pannello ammesse da CORS, separate da virgola. */
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o !== ''),
    ),
  /** Proxy fidati (Caddy sulla stessa macchina): servono per leggere l'IP vero del client nel rate limit. */
  TRUST_PROXY: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});
export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    // Solo i nomi delle variabili: mai i valori (potrebbero contenere segreti)
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))].join(', ');
    throw new Error(`Configurazione non valida: ${names}`);
  }
  return parsed.data;
}
