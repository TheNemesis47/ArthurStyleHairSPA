import type { FastifyPluginCallback, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type pg from 'pg';
import { z } from 'zod';
import { CancelRequest, ManagedBooking, ManageToken, Problem, RescheduleRequest } from '@arthur/contracts';
import { computeAvailability, localDateOf, toZonedIso, type Clock } from '@arthur/core';
import {
  BookingRejected,
  cancelBooking,
  findByManageToken,
  getBookingRules,
  getLocation,
  loadAvailabilityInput,
  rescheduleBooking,
  sha256,
  type HoldView,
} from '@arthur/db';
import { bookingIcs } from '../ics.ts';
import { sendProblem } from '../problems.ts';
import { nearestSlots } from '../slots.ts';
import { bookingSummary, REJECTION } from './booking.ts';

interface Options {
  readonly pool: pg.Pool;
  readonly organizationId: string;
  readonly clock: Clock;
  readonly publicOrigin: string;
  /** Richieste per IP ogni 10 minuti su tutte le rotte del link. */
  readonly limit: number;
}

const MIN = 60_000;

const ICS_TEXTS = {
  it: { description: 'Per disdire o spostare usa il link nell’email di conferma.' },
  en: { description: 'To cancel or reschedule, use the link in your confirmation email.' },
} as const;

/** Lingua dei testi del file calendario da Accept-Language (it di default). */
const langOf = (request: FastifyRequest): 'it' | 'en' =>
  (request.headers['accept-language'] ?? '').toLowerCase().startsWith('en') ? 'en' : 'it';

/**
 * Link di gestione (docs/07 §3): chi ha il token (256 bit, solo l'hash in DB) vede, disdice o sposta QUELLA
 * prenotazione. Il token è nell'URL: helmet manda `Referrer-Policy: no-referrer` e il log lo oscura (app.ts).
 */
export const manageRoutes: FastifyPluginCallback<Options> = (fastify, opts, done) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { pool, organizationId, clock, publicOrigin: origin } = opts;
  const tags = ['manage'];
  const config = { auth: 'manage-token' as const, rateLimit: { max: opts.limit, timeWindow: '10 minutes' } };
  const params = z.object({ token: ManageToken });
  const find = (token: string) => findByManageToken(pool, organizationId, sha256(token));

  async function managed(v: HoldView) {
    const now = clock.now();
    const [rules, location] = await Promise.all([
      getBookingRules(pool, organizationId, v.locationId),
      getLocation(pool, organizationId, v.locationSlug, now),
    ]);
    const cancelUntil = v.start.getTime() - rules.cancelWindowMin * MIN;
    const rescheduleUntil = v.start.getTime() - rules.rescheduleWindowMin * MIN;
    const active = v.status === 'confirmed';
    return {
      ...bookingSummary(v),
      canCancel: active && now <= cancelUntil,
      canReschedule: active && now <= rescheduleUntil,
      cancelUntil: toZonedIso(cancelUntil, v.timezone),
      rescheduleUntil: toZonedIso(rescheduleUntil, v.timezone),
      contact: { phone: location?.phoneE164 ?? null, whatsapp: location?.whatsappE164 ?? null },
    };
  }

  app.get(
    '/manage/:token',
    {
      config,
      schema: {
        tags,
        summary: 'Prenotazione dal link di gestione',
        params,
        response: { 200: ManagedBooking, 404: Problem },
      },
    },
    async (request, reply) => {
      const v = await find(request.params.token);
      if (v === undefined) return sendProblem(reply, origin, 'not-found');
      reply.header('cache-control', 'no-store');
      return managed(v);
    },
  );

  app.post(
    '/manage/:token/cancel',
    {
      config,
      schema: {
        tags,
        summary: 'Disdetta self-service, entro la finestra della sede (default 4 giorni prima)',
        params,
        body: CancelRequest,
        response: { 200: ManagedBooking, 404: Problem, 409: Problem, 422: Problem },
      },
    },
    async (request, reply) => {
      const v = await find(request.params.token);
      if (v === undefined) return sendProblem(reply, origin, 'not-found');
      const rules = await getBookingRules(pool, organizationId, v.locationId);
      try {
        await cancelBooking(pool, {
          organizationId,
          bookingId: v.id,
          by: 'customer',
          reason: request.body.reason ?? null,
          now: new Date(clock.now()),
          cancelWindowMin: rules.cancelWindowMin,
        });
      } catch (e) {
        if (e instanceof BookingRejected) return sendProblem(reply, origin, REJECTION[e.reason]);
        throw e;
      }
      const after = await find(request.params.token);
      if (after === undefined) throw new Error('prenotazione annullata non trovata');
      reply.header('cache-control', 'no-store');
      return managed(after);
    },
  );

  app.post(
    '/manage/:token/reschedule',
    {
      config,
      schema: {
        tags,
        summary: 'Spostamento atomico: se il nuovo orario è occupato, la prenotazione resta com’era',
        params,
        body: RescheduleRequest,
        response: { 200: ManagedBooking, 404: Problem, 409: Problem, 422: Problem },
      },
    },
    async (request, reply) => {
      const v = await find(request.params.token);
      if (v === undefined) return sendProblem(reply, origin, 'not-found');
      if (v.status !== 'confirmed') return sendProblem(reply, origin, 'not-active');
      const now = clock.now();
      const rules = await getBookingRules(pool, organizationId, v.locationId);
      // La finestra vale per l'appuntamento ATTUALE: prima di cercare orari, così la risposta è quella giusta.
      if (v.start.getTime() - now < rules.rescheduleWindowMin * MIN)
        return sendProblem(reply, origin, 'outside-policy');

      const startMs = Date.parse(request.body.start);
      const services = v.items.map((i) => i.slug);
      const day = localDateOf(startMs, v.timezone);
      const load = await loadAvailabilityInput(pool, organizationId, {
        locationSlug: v.locationSlug,
        serviceSlugs: services,
        from: day,
        to: day,
        now,
        ignore: { bookingId: v.id }, // può sovrapporsi a se stessa (es. 30 minuti più tardi)
      });
      if (!load.ok)
        return sendProblem(reply, origin, 'outside-policy', {
          detail: 'Questi servizi non sono più prenotabili online: contatta il salone',
        });
      const taken = async () =>
        sendProblem(reply, origin, 'slot-taken', {
          alternatives: await nearestSlots(pool, organizationId, clock, {
            location: v.locationSlug,
            services,
            startMs,
            timezone: v.timezone,
            ignore: { bookingId: v.id },
          }),
        });
      const slot = computeAvailability(load.input).find((s) => s.customerStart === startMs);
      if (slot === undefined) return taken();
      try {
        await rescheduleBooking(pool, {
          organizationId,
          bookingId: v.id,
          timezone: v.timezone,
          slot,
          by: 'customer',
          now: new Date(now),
          rescheduleWindowMin: rules.rescheduleWindowMin,
        });
      } catch (e) {
        if (e instanceof BookingRejected) {
          if (e.reason === 'slot-taken') return taken();
          return sendProblem(reply, origin, REJECTION[e.reason]);
        }
        throw e;
      }
      const after = await find(request.params.token);
      if (after === undefined) throw new Error('prenotazione spostata non trovata');
      reply.header('cache-control', 'no-store');
      return managed(after);
    },
  );

  app.get(
    '/manage/:token/ics',
    {
      config,
      schema: {
        tags,
        summary: 'File calendario (.ics) della prenotazione',
        params,
        response: { 200: z.string().describe('text/calendar (RFC 5545)'), 404: Problem },
      },
    },
    async (request, reply) => {
      const v = await find(request.params.token);
      if (v === undefined) return sendProblem(reply, origin, 'not-found');
      const lang = langOf(request);
      const location = await getLocation(pool, organizationId, v.locationSlug, clock.now());
      const names = v.items.map((i) => i.name[lang] ?? i.name['it'] ?? i.slug);
      reply
        .header('content-type', 'text/calendar; charset=utf-8')
        .header('content-disposition', 'attachment; filename="arthur-style.ics"')
        .header('cache-control', 'no-store');
      return bookingIcs({
        uid: `${v.id}@arthur-style`,
        sequence: v.version,
        start: v.start.getTime(),
        end: v.end.getTime(),
        stamp: clock.now(),
        summary: `Arthur Style — ${names.join(' + ')}`,
        location: location?.name ?? 'Arthur Style',
        description: ICS_TEXTS[lang].description,
        cancelled: v.status === 'cancelled',
      });
    },
  );

  done();
};
