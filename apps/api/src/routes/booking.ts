import type { FastifyPluginCallback, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type pg from 'pg';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  Confirmation,
  ConfirmRequest,
  CreateHeaders,
  Hold,
  HoldRequest,
  HumanCheckHeaders,
  OtpAccepted,
  OtpRequest,
  OtpVerified,
  OtpVerifyRequest,
  Problem,
  type ProblemCode,
} from '@arthur/contracts';
import { computeAvailability, localDateOf, toZonedIso, type Clock } from '@arthur/core';
import {
  BookingRejected,
  confirmHold,
  createHold,
  findByIdempotencyKey,
  getBookingRules,
  getHold,
  getLocation,
  issueContactVerification,
  loadAvailabilityInput,
  releaseHold,
  sha256,
  verifyContactCode,
  type BookingRejection,
  type HoldView,
} from '@arthur/db';
import { otpMessage, type Mailer } from '../mail.ts';
import { sendProblem } from '../problems.ts';
import { nearestSlots } from '../slots.ts';
import {
  ensureHoldSession,
  hmac,
  randomToken,
  readHoldSession,
  safeEqual,
  sixDigitCode,
  type HumanVerifier,
} from '../security.ts';

export interface BookingLimits {
  /** Hold creati per IP all'ora (docs/06 E10, E11). */
  readonly holdsPerHour: number;
  /** Richieste di codice per IP ogni 10 minuti. */
  readonly otpRequestsPer10Min: number;
  /** Verifiche di codice per IP ogni 10 minuti (oltre ai 5 tentativi per codice). */
  readonly otpVerifiesPer10Min: number;
  /** Conferme e rilasci per IP ogni 10 minuti. */
  readonly writesPer10Min: number;
}

export const DEFAULT_BOOKING_LIMITS: BookingLimits = {
  holdsPerHour: 10,
  otpRequestsPer10Min: 5,
  otpVerifiesPer10Min: 20,
  writesPer10Min: 30,
};

interface Options {
  readonly pool: pg.Pool;
  readonly organizationId: string;
  readonly clock: Clock;
  readonly publicOrigin: string;
  readonly human: HumanVerifier;
  readonly mailer: Mailer;
  readonly otpSecret: string;
  readonly limits: BookingLimits;
}

const MIN = 60_000;
/** docs/12 §5: 6 cifre, 10 minuti, max 5 tentativi; max 3 codici in 15' e 10 al giorno per indirizzo. */
const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LIMITS = { perWindow: 3, windowMin: 15, perDay: 10 };
const VERIFICATION_TOKEN_TTL_MIN = 15;

/** Rifiuti del dominio → codici RFC 9457 di docs/07 §6. */
export const REJECTION: Record<BookingRejection, ProblemCode> = {
  'not-found': 'not-found',
  'not-held': 'not-held',
  'contact-not-verified': 'otp-required',
  'hold-expired': 'hold-expired',
  'hold-not-owned': 'hold-not-owned',
  'customer-blocked': 'customer-blocked',
  'too-many-future-bookings': 'too-many-future-bookings',
  'customer-overlap': 'customer-overlap',
  'not-confirmed': 'not-active',
  'outside-policy': 'outside-policy',
  'slot-taken': 'slot-taken',
};

export function bookingSummary(v: HoldView) {
  return {
    id: v.id,
    status: v.status,
    location: v.locationSlug,
    timezone: v.timezone,
    start: toZonedIso(v.start.getTime(), v.timezone),
    end: toZonedIso(v.end.getTime(), v.timezone),
    services: v.items.map((i) => ({
      slug: i.slug,
      name: { ...i.name },
      price: { amountCents: i.priceCents, currency: v.currency, isFrom: i.priceIsFrom },
    })),
    total: { amountCents: v.totalCents, currency: v.currency, isFrom: v.items.some((i) => i.priceIsFrom) },
  };
}

/** Prenotazione pubblica dal sito (docs/07 §3, docs/06 §4): hold → OTP via email → conferma. */
export const bookingRoutes: FastifyPluginCallback<Options> = (fastify, opts, done) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { pool, organizationId, clock, publicOrigin: origin, human, mailer, otpSecret, limits } = opts;
  const tags = ['booking'];
  const perHour = (max: number) => ({ max, timeWindow: '1 hour' });
  const per10Min = (max: number) => ({ max, timeWindow: '10 minutes' });

  function holdResponse(reply: FastifyReply, v: HoldView) {
    reply.code(201).header('cache-control', 'no-store');
    return { ...bookingSummary(v), expiresAt: toZonedIso((v.expiresAt ?? v.start).getTime(), v.timezone) };
  }

  /** Stessa Idempotency-Key: stessa risposta solo alla stessa sessione; da un'altra sessione è un errore. */
  function replay(reply: FastifyReply, v: HoldView, session: Buffer | null) {
    if (v.sessionHash !== null && session !== null && v.sessionHash.equals(session))
      return holdResponse(reply, v);
    return sendProblem(reply, origin, 'idempotency-key-reused');
  }

  app.post(
    '/booking-holds',
    {
      config: { auth: 'public', rateLimit: perHour(limits.holdsPerHour) },
      schema: {
        tags,
        summary:
          "Blocca l'orario per qualche minuto mentre il cliente conferma (l'operatore lo sceglie il server)",
        headers: CreateHeaders,
        body: HoldRequest,
        response: {
          201: Hold,
          400: Problem,
          403: Problem,
          404: Problem,
          409: Problem,
          422: Problem,
          503: Problem,
        },
      },
    },
    async (request, reply) => {
      const { location, services, start } = request.body;
      const key = request.headers['idempotency-key'];

      // (1) Ripetizione di rete: nessun nuovo token Turnstile (sono monouso), stessa risposta.
      const previous = await findByIdempotencyKey(pool, organizationId, location, key);
      if (previous !== undefined) return replay(reply, previous, readHoldSession(request));

      // (2) Prima dell'hold, la verifica umana (docs/06 E11: niente bot che occupano l'agenda).
      if (!(await human.verify(request.headers['cf-turnstile-response'], request.ip)))
        return sendProblem(reply, origin, 'human-check-failed');

      const now = clock.now();
      const loc = await getLocation(pool, organizationId, location, now);
      if (loc === undefined) return sendProblem(reply, origin, 'not-found');
      const startMs = Date.parse(start);
      const sessionHash = ensureHoldSession(request, reply);
      const day = localDateOf(startMs, loc.timezone);

      // (3) Il server ricalcola lo slot con i dati freschi: il client indica solo l'orario (regola 2).
      const load = await loadAvailabilityInput(pool, organizationId, {
        locationSlug: location,
        serviceSlugs: services,
        from: day,
        to: day,
        now,
        ignore: { holdSessionHash: sessionHash },
      });
      if (!load.ok) {
        if (load.reason === 'location-not-found') return sendProblem(reply, origin, 'not-found');
        return sendProblem(reply, origin, 'validation', {
          fieldErrors: { services: [`non prenotabili online: ${load.slugs.join(', ')}`] },
        });
      }
      const taken = async () =>
        sendProblem(reply, origin, 'slot-taken', {
          alternatives: await nearestSlots(pool, organizationId, clock, {
            location,
            services,
            startMs,
            timezone: loc.timezone,
            ignore: { holdSessionHash: sessionHash },
          }),
        });
      const slot = computeAvailability(load.input).find((s) => s.customerStart === startMs);
      if (slot === undefined) return taken();

      const result = await createHold(pool, {
        organizationId,
        locationId: load.location.id,
        timezone: load.location.timezone,
        slot,
        items: load.services.map((s, i) => ({
          serviceId: s.id,
          priceCents: s.priceCents,
          snapshot: {
            slug: s.slug,
            name: s.name,
            priceCents: s.priceCents,
            priceIsFrom: s.priceIsFrom,
            definition: load.input.services[i],
          },
        })),
        currency: load.location.currency,
        source: 'web',
        now: new Date(now),
        expiresAt: new Date(now + load.rules.holdTtlSec * 1000),
        sessionHash,
        idempotencyKey: key,
        createdByActor: { type: 'anonymous', channel: 'web' },
      });
      if (result.ok) {
        const view = await getHold(pool, organizationId, result.bookingId);
        if (view === undefined) throw new Error('hold appena creato non trovato');
        return holdResponse(reply, view);
      }
      if (result.reason === 'slot-taken') return taken();
      if (result.reason === 'busy') return sendProblem(reply, origin, 'unavailable');
      // duplicate-key: due richieste concorrenti con la stessa chiave, ha vinto l'altra
      const winner = await findByIdempotencyKey(pool, organizationId, location, key);
      if (winner === undefined) return sendProblem(reply, origin, 'unavailable');
      return replay(reply, winner, sessionHash);
    },
  );

  app.delete(
    '/booking-holds/:id',
    {
      config: { auth: 'hold-session', rateLimit: per10Min(limits.writesPer10Min) },
      schema: {
        tags,
        summary: "Rilascia l'hold (l'utente torna indietro). Solo la sessione che l'ha creato",
        params: z.object({ id: z.uuid() }),
        response: { 204: z.null(), 403: Problem, 404: Problem, 409: Problem },
      },
    },
    async (request, reply) => {
      const result = await releaseHold(pool, {
        organizationId,
        bookingId: request.params.id,
        sessionHash: readHoldSession(request),
        now: new Date(clock.now()),
      });
      if (result === 'not-found') return sendProblem(reply, origin, 'not-found');
      if (result === 'not-owned') return sendProblem(reply, origin, 'hold-not-owned');
      if (result === 'not-held') return sendProblem(reply, origin, 'not-held');
      return reply.code(204).send(null);
    },
  );

  app.post(
    '/otp',
    {
      config: { auth: 'public', rateLimit: per10Min(limits.otpRequestsPer10Min) },
      schema: {
        tags,
        summary: 'Invia un codice di verifica via email. Risposta sempre uguale (anti-enumerazione)',
        headers: HumanCheckHeaders,
        body: OtpRequest,
        response: { 202: OtpAccepted, 400: Problem, 403: Problem, 503: Problem },
      },
    },
    async (request, reply) => {
      if (!(await human.verify(request.headers['cf-turnstile-response'], request.ip)))
        return sendProblem(reply, origin, 'human-check-failed');
      const { email, locale } = request.body;
      const now = clock.now();
      const id = randomUUID();
      const code = sixDigitCode();
      const issued = await issueContactVerification(pool, {
        organizationId,
        id,
        destination: email,
        codeHash: hmac(otpSecret, `${id}:${code}`),
        ipHash: hmac(otpSecret, `ip:${request.ip}`),
        now: new Date(now),
        expiresAt: new Date(now + OTP_TTL_MIN * MIN),
        limits: OTP_LIMITS,
      });
      if (issued === 'issued') {
        try {
          await mailer.send(otpMessage(email, locale, code, OTP_TTL_MIN));
        } catch (err) {
          // niente indirizzo né codice nel log (regola 5)
          request.log.warn({ err: { message: (err as Error).message } }, 'invio OTP non riuscito');
          return sendProblem(reply, origin, 'unavailable');
        }
      }
      reply.code(202).header('cache-control', 'no-store');
      return { status: 'accepted' as const, expiresInSec: OTP_TTL_MIN * 60 };
    },
  );

  app.post(
    '/otp/verify',
    {
      config: { auth: 'public', rateLimit: per10Min(limits.otpVerifiesPer10Min) },
      schema: {
        tags,
        summary: 'Verifica il codice: max 5 tentativi per codice, poi serve un codice nuovo',
        body: OtpVerifyRequest,
        response: { 200: OtpVerified, 400: Problem, 401: Problem, 429: Problem },
      },
    },
    async (request, reply) => {
      const { email, code } = request.body;
      const now = clock.now();
      const token = randomToken();
      const expiresAt = now + VERIFICATION_TOKEN_TTL_MIN * MIN;
      const result = await verifyContactCode(pool, {
        organizationId,
        destination: email,
        now: new Date(now),
        maxAttempts: OTP_MAX_ATTEMPTS,
        matches: (id, stored) => safeEqual(hmac(otpSecret, `${id}:${code}`), stored),
        tokenHash: sha256(token),
        tokenExpiresAt: new Date(expiresAt),
      });
      if (result === 'invalid') return sendProblem(reply, origin, 'otp-invalid');
      if (result === 'locked') return sendProblem(reply, origin, 'otp-locked');
      reply.header('cache-control', 'no-store');
      return { verificationToken: token, expiresAt: toZonedIso(expiresAt, 'UTC') };
    },
  );

  app.post(
    '/booking-holds/:id/confirm',
    {
      config: { auth: 'hold-session', rateLimit: per10Min(limits.writesPer10Min) },
      schema: {
        tags,
        summary: 'Conferma con i dati del cliente e il token di verifica dell’email',
        params: z.object({ id: z.uuid() }),
        body: ConfirmRequest,
        response: {
          201: Confirmation,
          400: Problem,
          401: Problem,
          403: Problem,
          404: Problem,
          409: Problem,
          410: Problem,
          422: Problem,
        },
      },
    },
    async (request, reply) => {
      const session = readHoldSession(request);
      if (session === null) return sendProblem(reply, origin, 'hold-not-owned');
      const view = await getHold(pool, organizationId, request.params.id);
      if (view === undefined) return sendProblem(reply, origin, 'not-found');
      const rules = await getBookingRules(pool, organizationId, view.locationId);
      const body = request.body;
      try {
        const { manageToken } = await confirmHold(pool, {
          organizationId,
          bookingId: view.id,
          sessionHash: session,
          customer: { ...body.customer },
          verification: { kind: 'otp-token', tokenHash: sha256(body.verificationToken) },
          marketingConsent: body.marketingConsent,
          customerNote: body.note === undefined || body.note === '' ? null : body.note,
          now: new Date(clock.now()),
          maxFutureBookings: rules.maxFutureBookings,
        });
        const confirmed = await getHold(pool, organizationId, view.id);
        if (confirmed === undefined) throw new Error('prenotazione confermata non trovata');
        reply.code(201).header('cache-control', 'no-store');
        return { booking: bookingSummary(confirmed), manageToken };
      } catch (e) {
        if (e instanceof BookingRejected) return sendProblem(reply, origin, REJECTION[e.reason]);
        throw e;
      }
    },
  );

  done();
};
