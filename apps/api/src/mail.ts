import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Porta per l'invio delle email transazionali. Il provider via API (docs/04, docs/20) arriva con il worker
 * (backend passo 3); per ora c'è solo l'adattatore di sviluppo che scrive su file.
 */
export interface MailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

type Locale = 'it' | 'en';

const OTP_TEXTS: Record<Locale, { subject: string; body: (code: string, minutes: number) => string }> = {
  it: {
    subject: 'Il tuo codice di verifica Arthur Style',
    body: (code, minutes) =>
      [
        `Il tuo codice è ${code}.`,
        `Vale ${String(minutes)} minuti e si può usare una sola volta.`,
        '',
        'Se non hai chiesto tu questo codice, ignora questa email: nessuna prenotazione è stata fatta.',
        '',
        'Arthur Style · Hair Spa',
      ].join('\n'),
  },
  en: {
    subject: 'Your Arthur Style verification code',
    body: (code, minutes) =>
      [
        `Your code is ${code}.`,
        `It is valid for ${String(minutes)} minutes and can be used only once.`,
        '',
        'If you did not request this code, ignore this email: no booking has been made.',
        '',
        'Arthur Style · Hair Spa',
      ].join('\n'),
  },
};

export function otpMessage(to: string, locale: Locale, code: string, minutes: number): MailMessage {
  const t = OTP_TEXTS[locale];
  return { to, subject: t.subject, text: t.body(code, minutes) };
}

/**
 * SOLO sviluppo: ogni email diventa un file nella cartella indicata (permessi 0600), niente nei log.
 * Il server rifiuta questo adattatore con NODE_ENV=production (config.ts).
 */
export function devFileMailer(dir: string): Mailer {
  return {
    async send(message) {
      await mkdir(dir, { recursive: true, mode: 0o700 });
      const content = `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`;
      await writeFile(join(dir, `${randomUUID()}.txt`), content, { mode: 0o600 });
    },
  };
}
