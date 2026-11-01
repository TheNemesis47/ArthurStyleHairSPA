import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';
import type { Problem, ProblemCode } from '@arthur/contracts';

/** Titoli generici (in italiano: la lingua del salone; i client mostrano i propri testi in base a `type`). */
const TITLES: Record<ProblemCode, string> = {
  validation: 'Richiesta non valida',
  'not-found': 'Risorsa inesistente',
  'rate-limited': 'Troppe richieste, riprova tra poco',
  unavailable: 'Servizio momentaneamente non disponibile',
  internal: 'Errore interno',
  'slot-taken': 'Questo orario è appena stato prenotato',
  'customer-overlap': 'Hai già un appuntamento in quell’orario',
  'hold-expired': 'Il tempo per confermare è scaduto',
  'hold-not-owned': 'Questa prenotazione non è tua',
  'outside-policy': 'Orario fuori dalle regole di prenotazione',
  'too-many-future-bookings': 'Hai già troppe prenotazioni future',
  'customer-blocked': 'Prenotazione online non disponibile',
  'otp-required': 'Serve il codice di verifica',
  'otp-invalid': 'Codice non valido',
  'otp-locked': 'Troppi tentativi, riprova più tardi',
  'version-conflict': 'Qualcun altro ha modificato questi dati',
  'human-check-failed': 'Verifica anti-bot non superata',
  'idempotency-key-reused': 'Idempotency-Key già usata per un’altra richiesta',
  'not-held': 'La prenotazione non è più in attesa di conferma',
  'not-active': 'La prenotazione non è attiva',
  'forbidden-origin': 'Origine della richiesta non ammessa',
};

const STATUS: Record<ProblemCode, number> = {
  validation: 400,
  'not-found': 404,
  'rate-limited': 429,
  unavailable: 503,
  internal: 500,
  'slot-taken': 409,
  'customer-overlap': 409,
  'hold-expired': 410,
  'hold-not-owned': 403,
  'outside-policy': 422,
  'too-many-future-bookings': 422,
  'customer-blocked': 403,
  'otp-required': 401,
  'otp-invalid': 401,
  'otp-locked': 429,
  'version-conflict': 412,
  'human-check-failed': 403,
  'idempotency-key-reused': 422,
  'not-held': 409,
  'not-active': 409,
  'forbidden-origin': 403,
};

export type FieldErrors = Record<string, string[]>;
export interface ProblemExtra {
  detail?: string;
  fieldErrors?: FieldErrors;
  alternatives?: { start: string; end: string }[];
}

export function problemBody(origin: string, code: ProblemCode, extra: ProblemExtra = {}): Problem {
  return { type: `${origin}/problems/${code}`, title: TITLES[code], status: STATUS[code], ...extra };
}

export function sendProblem(
  reply: FastifyReply,
  origin: string,
  code: ProblemCode,
  extra: ProblemExtra = {},
): FastifyReply {
  return reply
    .code(STATUS[code])
    .type('application/problem+json; charset=utf-8')
    .send(problemBody(origin, code, extra));
}

/** Percorso del campo dall'errore di validazione: `/services/0` → `services`; vuoto → contesto ('querystring'). */
function fieldOf(instancePath: string, context: string | undefined): string {
  const first = instancePath.split('/').filter((p) => p !== '')[0];
  return first ?? context ?? 'request';
}

/**
 * Tutti gli errori diventano RFC 9457. Gli errori inattesi si registrano nel log (senza dati personali) e al client
 * arriva solo un messaggio generico: mai stack trace, SQL o dettagli interni.
 */
export function installErrorHandlers(app: FastifyInstance, origin: string): void {
  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      const fieldErrors: FieldErrors = {};
      for (const v of err.validation) {
        const field = fieldOf(v.instancePath, err.validationContext);
        (fieldErrors[field] ??= []).push(v.message ?? 'non valido');
      }
      return sendProblem(reply, origin, 'validation', { fieldErrors });
    }
    if (isResponseSerializationError(err)) {
      request.log.error(
        { err: { message: err.message, url: err.url } },
        'risposta non conforme al contratto',
      );
      return sendProblem(reply, origin, 'internal');
    }
    const status = err.statusCode ?? 500;
    if (status === 429) return sendProblem(reply, origin, 'rate-limited');
    if (status >= 400 && status < 500) {
      // Errori del client riconosciuti da Fastify (JSON malformato, media type, corpo troppo grande…)
      return reply
        .code(status)
        .type('application/problem+json; charset=utf-8')
        .send({
          type: `${origin}/problems/http-${String(status)}`,
          title: 'Richiesta non accettata',
          status,
        });
    }
    request.log.error({ err }, 'errore non gestito');
    return sendProblem(reply, origin, 'internal');
  });
}
