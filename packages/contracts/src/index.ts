import { z } from 'zod';

/**
 * Contratti dell'API /v1 (docs/07): un solo posto per gli schemi di richieste e risposte, condiviso da API, sito,
 * pannello, app e MCP. L'OpenAPI 3.1 (openapi.json) si genera da qui ed è verificata in CI.
 */

export const Slug = z.string().regex(/^[a-z0-9-]{2,60}$/);
export const LocalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe('Data locale della sede, YYYY-MM-DD');
export const LocalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const IsoDateTime = z
  .string()
  .describe('ISO 8601 con offset della sede, es. 2026-11-03T10:30:00+01:00');
export const LocalizedText = z
  .record(z.string(), z.string())
  .describe('Testo per lingua: { "it": "…", "en": "…" }');

/** Errore RFC 9457 (application/problem+json). Mai stack trace o SQL. */
export const Problem = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string().optional(),
    instance: z.string().optional(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  })
  .meta({ id: 'Problem' });
export type Problem = z.infer<typeof Problem>;

/** Codici `type` di docs/07 §6 (più quelli generici HTTP). */
export const ProblemCode = z.enum([
  'validation',
  'not-found',
  'rate-limited',
  'unavailable',
  'internal',
  'slot-taken',
  'customer-overlap',
  'hold-expired',
  'hold-not-owned',
  'outside-policy',
  'too-many-future-bookings',
  'customer-blocked',
  'otp-required',
  'otp-invalid',
  'otp-locked',
  'version-conflict',
]);
export type ProblemCode = z.infer<typeof ProblemCode>;

export const LocationSummary = z
  .object({
    slug: Slug,
    name: z.string(),
    status: z.enum(['active', 'closing']),
    countryCode: z.string().length(2),
    timezone: z.string(),
    currency: z.string().length(3),
    defaultLocale: z.enum(['it', 'en']),
    opensOn: LocalDate.nullable(),
  })
  .meta({ id: 'LocationSummary' });

export const LocationList = z.object({ locations: z.array(LocationSummary) });

export const OpeningHours = z.object({
  weekday: z.number().int().min(1).max(7).describe('ISO: 1 = lunedì'),
  start: LocalTime,
  end: LocalTime,
  lastStart: LocalTime.nullable().describe('Ultimo orario di inizio accettato'),
});

export const LocationDetail = LocationSummary.extend({
  address: z.record(z.string(), z.unknown()),
  phone: z.string().nullable().describe('E.164'),
  whatsapp: z.string().nullable().describe('E.164'),
  email: z.string().nullable(),
  hours: z.array(OpeningHours).describe('Orari validi oggi'),
}).meta({ id: 'LocationDetail' });

export const Price = z.object({
  amountCents: z.number().int().min(0).describe('Centesimi, IVA inclusa'),
  currency: z.string().length(3),
  isFrom: z.boolean().describe('"A partire da": il prezzo finale dipende dai capelli'),
});

export const CatalogService = z.object({
  slug: Slug,
  categoryId: z.string().nullable(),
  name: LocalizedText,
  description: LocalizedText,
  price: Price,
  durationMin: z.number().int().positive().describe('Durata percepita dal cliente (buffer esclusi)'),
  onlineBookable: z.boolean().describe('false = solo su consulenza'),
});

export const ServiceCatalog = z
  .object({
    location: Slug,
    categories: z.array(z.object({ id: z.string(), name: LocalizedText })),
    services: z.array(CatalogService),
  })
  .meta({ id: 'ServiceCatalog' });

export const MAX_SERVICES_PER_BOOKING = 5;

export const AvailabilityQuery = z.object({
  location: Slug,
  services: z
    .string()
    .describe('Slug dei servizi separati da virgola, nell’ordine di esecuzione (max 5)')
    .transform((s) => s.split(','))
    .pipe(
      z
        .array(Slug)
        .min(1)
        .max(MAX_SERVICES_PER_BOOKING)
        .refine((a) => new Set(a).size === a.length, 'servizi ripetuti'),
    ),
  from: LocalDate,
  to: LocalDate,
});

export const Availability = z
  .object({
    location: Slug,
    timezone: z.string(),
    from: LocalDate,
    to: LocalDate,
    services: z.array(Slug),
    slots: z
      .array(z.object({ start: IsoDateTime, end: IsoDateTime }))
      .describe('Orari proposti al cliente, in ordine'),
  })
  .meta({ id: 'Availability' });

export const Health = z.object({ status: z.literal('ok') });
