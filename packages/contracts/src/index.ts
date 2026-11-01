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
    alternatives: z
      .array(z.object({ start: IsoDateTime, end: IsoDateTime }))
      .optional()
      .describe('Con slot-taken: gli orari liberi più vicini a quello richiesto'),
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
  'human-check-failed',
  'idempotency-key-reused',
  'not-held',
  'not-active',
  'forbidden-origin',
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

const ServiceSlugs = z
  .array(Slug)
  .min(1)
  .max(MAX_SERVICES_PER_BOOKING)
  .refine((a) => new Set(a).size === a.length, 'servizi ripetuti');

export const AvailabilityQuery = z.object({
  location: Slug,
  services: z
    .string()
    .describe('Slug dei servizi separati da virgola, nell’ordine di esecuzione (max 5)')
    .transform((s) => s.split(','))
    .pipe(ServiceSlugs),
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

// ───────────────────────────── Prenotazione pubblica (docs/07 §3) ─────────────────────────────

export const Locale = z.enum(['it', 'en']);
/** Normalizzata (spazi tolti, minuscole) prima della validazione: un indirizzo = un profilo (Q39). */
export const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());
/** Nomi: niente caratteri di controllo (finiscono in email, calendario e pannello). */
const PersonName = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[^\p{Cc}\p{Cf}]+$/u, 'caratteri non ammessi');

export const Money = z.object({
  amountCents: z.number().int().min(0).describe('Centesimi, IVA inclusa'),
  currency: z.string().length(3),
});

export const BookingLine = z.object({
  slug: Slug,
  name: LocalizedText,
  price: Price,
});

export const BookingSummary = z
  .object({
    id: z.uuid(),
    status: z.enum(['held', 'confirmed', 'completed', 'cancelled', 'no_show', 'expired']),
    location: Slug,
    timezone: z.string(),
    start: IsoDateTime,
    end: IsoDateTime,
    services: z.array(BookingLine),
    total: Money.extend({ isFrom: z.boolean() }),
  })
  .meta({ id: 'BookingSummary' });

export const HoldRequest = z
  .object({
    location: Slug,
    services: ServiceSlugs.describe('Slug dei servizi, nell’ordine di esecuzione (max 5)'),
    start: z.iso.datetime({ offset: true }).describe('Uno degli orari restituiti da /v1/availability'),
  })
  .meta({ id: 'HoldRequest' });

export const Hold = BookingSummary.extend({
  expiresAt: IsoDateTime.describe('Oltre questo istante la conferma risponde 410'),
}).meta({ id: 'Hold' });

/** Header dei POST pubblici che creano qualcosa (docs/07 §1, §2). */
export const CreateHeaders = z.object({
  'idempotency-key': z
    .uuid()
    .describe('UUID generato dal client: una ripetizione restituisce la stessa risposta'),
  'cf-turnstile-response': z.string().max(2048).optional().describe('Token Cloudflare Turnstile'),
});
export const HumanCheckHeaders = z.object({
  'cf-turnstile-response': z.string().max(2048).optional().describe('Token Cloudflare Turnstile'),
});

export const OtpRequest = z.object({ email: Email, locale: Locale.default('it') }).meta({ id: 'OtpRequest' });
export const OtpAccepted = z
  .object({ status: z.literal('accepted'), expiresInSec: z.number().int() })
  .describe('Risposta sempre uguale, anche se il codice non è stato inviato (anti-enumerazione)')
  .meta({ id: 'OtpAccepted' });

export const OtpVerifyRequest = z
  .object({ email: Email, code: z.string().regex(/^\d{6}$/, '6 cifre') })
  .meta({ id: 'OtpVerifyRequest' });
export const OtpVerified = z
  .object({
    verificationToken: z.string().describe('Monouso: si passa alla conferma della prenotazione'),
    expiresAt: IsoDateTime,
  })
  .meta({ id: 'OtpVerified' });

export const ConfirmRequest = z
  .object({
    verificationToken: z.string().min(32).max(128),
    customer: z.object({ firstName: PersonName, lastName: PersonName, email: Email, locale: Locale }),
    acceptPrivacy: z.literal(true).describe('Presa visione dell’informativa privacy'),
    marketingConsent: z.boolean().default(false).describe('Facoltativo, mai preselezionato'),
    note: z.string().trim().max(500).optional(),
  })
  .meta({ id: 'ConfirmRequest' });

export const Confirmation = z
  .object({
    booking: BookingSummary,
    manageToken: z
      .string()
      .describe('Per il link di gestione /v1/manage/{token}: si mostra una volta, poi arriva via email'),
  })
  .meta({ id: 'Confirmation' });
