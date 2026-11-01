import type { FastifyPluginCallback } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type pg from 'pg';
import { z } from 'zod';
import {
  Availability,
  AvailabilityQuery,
  LocationDetail,
  LocationList,
  Problem,
  ServiceCatalog,
  Slug,
} from '@arthur/contracts';
import {
  computeAvailability,
  daysBetween,
  isValidLocalDate,
  MAX_RANGE_DAYS,
  toZonedIso,
  type Clock,
} from '@arthur/core';
import { getLocation, listLocations, listServices, loadAvailabilityInput } from '@arthur/db';
import { sendProblem, type FieldErrors } from '../problems.ts';

interface Options {
  readonly pool: pg.Pool;
  readonly organizationId: string;
  readonly clock: Clock;
  readonly publicOrigin: string;
  readonly availabilityLimit: number;
}

/** Dati pubblici che cambiano di rado: cache CDN di 5 minuti (docs/07 §3). */
const PUBLIC_CACHE = 'public, max-age=300';

/** Endpoint pubblici anonimi (docs/07 §3): sedi, catalogo, disponibilità. */
export const publicRoutes: FastifyPluginCallback<Options> = (fastify, opts, done) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { pool, organizationId, clock, publicOrigin: origin } = opts;
  const tags = ['public'];

  app.get(
    '/locations',
    {
      config: { auth: 'public' },
      schema: { tags, summary: 'Sedi attive', response: { 200: LocationList } },
    },
    async (_request, reply) => {
      const locations = await listLocations(pool, organizationId);
      reply.header('cache-control', PUBLIC_CACHE);
      return {
        locations: locations.map((l) => ({
          slug: l.slug,
          name: l.name,
          status: l.status as 'active' | 'closing',
          countryCode: l.countryCode,
          timezone: l.timezone,
          currency: l.currency,
          defaultLocale: l.defaultLocale as 'it' | 'en',
          opensOn: l.opensOn,
        })),
      };
    },
  );

  app.get(
    '/locations/:slug',
    {
      config: { auth: 'public' },
      schema: {
        tags,
        summary: 'Dettaglio della sede: indirizzo, contatti e orari',
        params: z.object({ slug: Slug }),
        response: { 200: LocationDetail, 404: Problem },
      },
    },
    async (request, reply) => {
      const l = await getLocation(pool, organizationId, request.params.slug, clock.now());
      if (l === undefined) return sendProblem(reply, origin, 'not-found');
      reply.header('cache-control', PUBLIC_CACHE);
      return {
        slug: l.slug,
        name: l.name,
        status: l.status as 'active' | 'closing',
        countryCode: l.countryCode,
        timezone: l.timezone,
        currency: l.currency,
        defaultLocale: l.defaultLocale as 'it' | 'en',
        opensOn: l.opensOn,
        address: l.address,
        phone: l.phoneE164,
        whatsapp: l.whatsappE164,
        email: l.email,
        hours: l.hours.map((h) => ({ ...h })),
      };
    },
  );

  app.get(
    '/locations/:slug/services',
    {
      config: { auth: 'public' },
      schema: {
        tags,
        summary: 'Catalogo: categorie, prezzi e durata percepita (le fasi interne non si espongono)',
        params: z.object({ slug: Slug }),
        response: { 200: ServiceCatalog, 404: Problem },
      },
    },
    async (request, reply) => {
      const slug = request.params.slug;
      const [catalog, location] = await Promise.all([
        listServices(pool, organizationId, slug),
        getLocation(pool, organizationId, slug, clock.now()),
      ]);
      if (catalog === undefined || location === undefined) return sendProblem(reply, origin, 'not-found');
      reply.header('cache-control', PUBLIC_CACHE);
      return {
        location: slug,
        categories: catalog.categories,
        services: catalog.services.map((s) => ({
          slug: s.slug,
          categoryId: s.categoryId,
          name: s.name,
          description: s.description,
          price: { amountCents: s.priceCents, currency: location.currency, isFrom: s.priceIsFrom },
          durationMin: s.durationMin,
          onlineBookable: s.onlineBookable,
        })),
      };
    },
  );

  app.get(
    '/availability',
    {
      config: { auth: 'public', rateLimit: { max: opts.availabilityLimit, timeWindow: '1 minute' } },
      schema: {
        tags,
        summary: `Orari liberi per uno o più servizi (max ${String(MAX_RANGE_DAYS)} giorni). Nessuna scelta dell'operatore (Q21)`,
        querystring: AvailabilityQuery,
        response: { 200: Availability, 400: Problem, 404: Problem },
      },
    },
    async (request, reply) => {
      const { location, services, from, to } = request.query;
      const fieldErrors: FieldErrors = {};
      if (!isValidLocalDate(from)) fieldErrors['from'] = ['data inesistente'];
      if (!isValidLocalDate(to)) fieldErrors['to'] = ['data inesistente'];
      if (Object.keys(fieldErrors).length === 0) {
        const days = daysBetween(from, to) + 1;
        if (days < 1) fieldErrors['to'] = ['deve essere uguale o successiva a from'];
        else if (days > MAX_RANGE_DAYS) fieldErrors['to'] = [`al massimo ${String(MAX_RANGE_DAYS)} giorni`];
      }
      if (Object.keys(fieldErrors).length > 0)
        return sendProblem(reply, origin, 'validation', { fieldErrors });

      const load = await loadAvailabilityInput(pool, organizationId, {
        locationSlug: location,
        serviceSlugs: services,
        from,
        to,
        now: clock.now(),
      });
      if (!load.ok) {
        if (load.reason === 'location-not-found') return sendProblem(reply, origin, 'not-found');
        return sendProblem(reply, origin, 'validation', {
          fieldErrors: { services: [`non prenotabili online: ${load.slugs.join(', ')}`] },
        });
      }

      // Più operatori possono offrire lo stesso orario: al cliente arriva una volta sola, senza dati interni.
      const seen = new Set<number>();
      const slots: { start: string; end: string }[] = [];
      for (const s of computeAvailability(load.input)) {
        if (seen.has(s.customerStart)) continue;
        seen.add(s.customerStart);
        slots.push({
          start: toZonedIso(s.customerStart, load.location.timezone),
          end: toZonedIso(s.customerEnd, load.location.timezone),
        });
      }
      reply.header('cache-control', 'no-store');
      return { location, timezone: load.location.timezone, from, to, services, slots };
    },
  );
  done();
};
