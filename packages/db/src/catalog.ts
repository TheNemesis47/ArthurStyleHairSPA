import type pg from 'pg';
import {
  localDateOf,
  startOfNextDay,
  zonedEpoch,
  type AvailabilityInput,
  type BookingPolicy,
  type EpochMs,
  type LocalDate,
  type ServiceDef,
  type StaffDef,
  type WeeklyWindow,
  type Weekday,
} from '@arthur/core';
import { withOrgTx } from './tx.ts';

/**
 * Letture pubbliche: sedi, catalogo e dati per il motore di disponibilità (docs/07 §3).
 * Ogni lettura gira con l'organizzazione impostata (RLS): una sede di un'altra organizzazione non esiste.
 */

const PUBLIC_STATUSES = ['active', 'closing'];
const DEFAULT_POLICY: BookingPolicy = { slotGranularityMin: 15, minNoticeMin: 180, maxAdvanceDays: 35 };
/** Default di booking_policies (migrazione 0001): valgono se la sede non ha ancora una riga di policy. */
const DEFAULT_RULES: BookingRules = {
  holdTtlSec: 600,
  cancelWindowMin: 5760,
  rescheduleWindowMin: 5760,
  maxFutureBookings: 3,
};
const DAY_MS = 86_400_000;

export interface LocationSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly status: string;
  readonly countryCode: string;
  readonly timezone: string;
  readonly currency: string;
  readonly defaultLocale: string;
  readonly opensOn: string | null;
}

export interface OpeningHours {
  readonly weekday: Weekday;
  readonly start: string;
  readonly end: string;
  readonly lastStart: string | null;
}

export interface LocationDetail extends LocationSummary {
  readonly address: Readonly<Record<string, unknown>>;
  readonly phoneE164: string | null;
  readonly whatsappE164: string | null;
  readonly email: string | null;
  /** Orari validi oggi (ora locale della sede). */
  readonly hours: readonly OpeningHours[];
}

export interface CatalogCategory {
  readonly id: string;
  readonly name: Readonly<Record<string, string>>;
}

export interface CatalogService {
  readonly id: string;
  readonly slug: string;
  readonly categoryId: string | null;
  readonly name: Readonly<Record<string, string>>;
  readonly description: Readonly<Record<string, string>>;
  readonly priceCents: number;
  readonly priceIsFrom: boolean;
  readonly onlineBookable: boolean;
  /** Durata vista dal cliente: somma delle fasi, buffer esclusi. Le fasi interne non si espongono. */
  readonly durationMin: number;
}

interface LocationRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  country_code: string;
  timezone: string;
  currency: string;
  default_locale: string;
  opens_on: string | null;
}

const LOCATION_COLUMNS = `id, slug, name, status, country_code, timezone, currency, default_locale,
  to_char(opens_on, 'YYYY-MM-DD') AS opens_on`;

function summary(r: LocationRow): LocationSummary {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    countryCode: r.country_code,
    timezone: r.timezone,
    currency: r.currency,
    defaultLocale: r.default_locale,
    opensOn: r.opens_on,
  };
}

/** 'HH:MM:SS' (colonna time) → 'HH:MM'. */
const hhmm = (t: string): string => t.slice(0, 5);

export async function findOrganizationId(pool: pg.Pool, slug: string): Promise<string | undefined> {
  const r = await pool.query<{ id: string }>('SELECT id FROM organizations WHERE slug = $1', [slug]);
  return r.rows[0]?.id;
}

export async function listLocations(pool: pg.Pool, organizationId: string): Promise<LocationSummary[]> {
  return withOrgTx(pool, organizationId, async (c) => {
    const r = await c.query<LocationRow>(
      `SELECT ${LOCATION_COLUMNS} FROM locations WHERE status = ANY($1) ORDER BY created_at, slug`,
      [PUBLIC_STATUSES],
    );
    return r.rows.map(summary);
  });
}

export async function getLocation(
  pool: pg.Pool,
  organizationId: string,
  slug: string,
  now: EpochMs,
): Promise<LocationDetail | undefined> {
  return withOrgTx(pool, organizationId, async (c) => {
    const r = await c.query<
      LocationRow & {
        address: Record<string, unknown>;
        phone_e164: string | null;
        whatsapp_e164: string | null;
        email: string | null;
      }
    >(
      `SELECT ${LOCATION_COLUMNS}, address, phone_e164, whatsapp_e164, email::text AS email
         FROM locations WHERE slug = $1 AND status = ANY($2)`,
      [slug, PUBLIC_STATUSES],
    );
    const row = r.rows[0];
    if (row === undefined) return undefined;
    const today = localDateOf(now, row.timezone);
    const hours = await c.query<{
      weekday: number;
      start_local: string;
      end_local: string;
      last_start_local: string | null;
    }>(
      `SELECT weekday, start_local::text, end_local::text, last_start_local::text
         FROM location_hours
        WHERE location_id = $1 AND valid_from <= $2::date AND (valid_to IS NULL OR valid_to >= $2::date)
        ORDER BY weekday, start_local`,
      [row.id, today],
    );
    return {
      ...summary(row),
      address: row.address,
      phoneE164: row.phone_e164,
      whatsappE164: row.whatsapp_e164,
      email: row.email,
      hours: hours.rows.map((h) => ({
        weekday: h.weekday as Weekday,
        start: hhmm(h.start_local),
        end: hhmm(h.end_local),
        lastStart: h.last_start_local === null ? null : hhmm(h.last_start_local),
      })),
    };
  });
}

/** Catalogo della sede (servizi non archiviati, anche quelli solo su consulenza: `onlineBookable` = false). */
export async function listServices(
  pool: pg.Pool,
  organizationId: string,
  locationSlug: string,
): Promise<{ categories: CatalogCategory[]; services: CatalogService[] } | undefined> {
  return withOrgTx(pool, organizationId, async (c) => {
    const loc = await c.query<{ id: string }>(
      'SELECT id FROM locations WHERE slug = $1 AND status = ANY($2)',
      [locationSlug, PUBLIC_STATUSES],
    );
    const locationId = loc.rows[0]?.id;
    if (locationId === undefined) return undefined;
    const categories = await c.query<{ id: string; name: Record<string, string> }>(
      'SELECT id, name FROM service_categories WHERE location_id = $1 ORDER BY sort_order, id',
      [locationId],
    );
    const services = await c.query<{
      id: string;
      slug: string;
      category_id: string | null;
      name: Record<string, string>;
      description: Record<string, string>;
      price_cents: number;
      price_is_from: boolean;
      online_bookable: boolean;
      duration_min: number;
    }>(
      `SELECT s.id, s.slug, s.category_id, s.name, s.description, s.price_cents, s.price_is_from, s.online_bookable,
              COALESCE(SUM(st.duration_min), 0)::int AS duration_min
         FROM services s LEFT JOIN service_steps st ON st.service_id = s.id
        WHERE s.location_id = $1 AND s.archived_at IS NULL
        GROUP BY s.id
        ORDER BY s.sort_order, s.slug`,
      [locationId],
    );
    return {
      categories: categories.rows,
      services: services.rows.map((s) => ({
        id: s.id,
        slug: s.slug,
        categoryId: s.category_id,
        name: s.name,
        description: s.description,
        priceCents: s.price_cents,
        priceIsFrom: s.price_is_from,
        onlineBookable: s.online_bookable,
        durationMin: s.duration_min,
      })),
    };
  });
}

export interface AvailabilityRequest {
  readonly locationSlug: string;
  /** Slug dei servizi, nell'ordine di esecuzione. */
  readonly serviceSlugs: readonly string[];
  readonly from: LocalDate;
  readonly to: LocalDate;
  readonly now: EpochMs;
  /**
   * Allocazioni da NON considerare occupate:
   * - bookingId: la prenotazione che si sta spostando (può sovrapporsi a se stessa);
   * - holdSessionHash: gli hold della sessione, che il nuovo hold sostituirà (docs/06 E10).
   */
  readonly ignore?: { readonly bookingId?: string; readonly holdSessionHash?: Buffer };
}

export interface BookableService {
  readonly id: string;
  readonly slug: string;
  readonly name: Readonly<Record<string, string>>;
  readonly priceCents: number;
  readonly priceIsFrom: boolean;
}

/** Regole della sede che non servono al motore ma all'API (docs/05 booking_policies). */
export interface BookingRules {
  readonly holdTtlSec: number;
  readonly cancelWindowMin: number;
  readonly rescheduleWindowMin: number;
  readonly maxFutureBookings: number;
}

export type AvailabilityLoad =
  | {
      readonly ok: true;
      readonly location: {
        readonly id: string;
        readonly slug: string;
        readonly timezone: string;
        readonly currency: string;
      };
      readonly services: readonly BookableService[];
      readonly rules: BookingRules;
      readonly input: AvailabilityInput;
    }
  | { readonly ok: false; readonly reason: 'location-not-found' }
  | { readonly ok: false; readonly reason: 'unknown-services'; readonly slugs: readonly string[] };

/** Regole di prenotazione della sede (default della migrazione se manca la riga). */
export async function getBookingRules(
  pool: pg.Pool,
  organizationId: string,
  locationId: string,
): Promise<BookingRules> {
  return withOrgTx(pool, organizationId, async (c) => {
    const r = await c.query<{
      hold_ttl_sec: number;
      cancel_window_min: number;
      reschedule_window_min: number;
      max_future_bookings: number;
    }>(
      `SELECT hold_ttl_sec, cancel_window_min, reschedule_window_min, max_future_bookings
         FROM booking_policies WHERE location_id = $1`,
      [locationId],
    );
    const p = r.rows[0];
    return p === undefined
      ? DEFAULT_RULES
      : {
          holdTtlSec: p.hold_ttl_sec,
          cancelWindowMin: p.cancel_window_min,
          rescheduleWindowMin: p.reschedule_window_min,
          maxFutureBookings: p.max_future_bookings,
        };
  });
}

/**
 * Raccoglie dal database tutto ciò che serve a `computeAvailability`: policy, orari, servizi con fasi e requisiti,
 * operatori prenotabili online, pool di postazioni, eccezioni e allocazioni attive nell'intervallo richiesto.
 * Servizi inesistenti, archiviati o non prenotabili online → 'unknown-services'.
 */
export async function loadAvailabilityInput(
  pool: pg.Pool,
  organizationId: string,
  req: AvailabilityRequest,
): Promise<AvailabilityLoad> {
  return withOrgTx(pool, organizationId, async (c) => {
    const loc = await c.query<{ id: string; slug: string; timezone: string; currency: string }>(
      `SELECT id, slug, timezone, currency FROM locations WHERE slug = $1 AND status = ANY($2)`,
      [req.locationSlug, PUBLIC_STATUSES],
    );
    const location = loc.rows[0];
    if (location === undefined) return { ok: false, reason: 'location-not-found' };

    const svc = await c.query<{
      id: string;
      slug: string;
      name: Record<string, string>;
      price_cents: number;
      price_is_from: boolean;
      buffer_before_min: number;
      buffer_after_min: number;
    }>(
      `SELECT id, slug, name, price_cents, price_is_from, buffer_before_min, buffer_after_min FROM services
        WHERE location_id = $1 AND slug = ANY($2) AND archived_at IS NULL AND online_bookable`,
      [location.id, [...req.serviceSlugs]],
    );
    const bySlug = new Map(svc.rows.map((s) => [s.slug, s]));
    const missing = req.serviceSlugs.filter((s) => !bySlug.has(s));
    if (missing.length > 0) return { ok: false, reason: 'unknown-services', slugs: missing };
    const ordered = req.serviceSlugs.map((s) => bySlug.get(s)).filter((s) => s !== undefined);
    const serviceIds = ordered.map((s) => s.id);

    const steps = await c.query<{
      id: string;
      service_id: string;
      duration_min: number;
      staff_busy: boolean;
    }>(
      'SELECT id, service_id, duration_min, staff_busy FROM service_steps WHERE service_id = ANY($1) ORDER BY position',
      [serviceIds],
    );
    const reqs = await c.query<{ step_id: string; pool_id: string; quantity: number }>(
      'SELECT step_id, pool_id, quantity FROM service_step_requirements WHERE step_id = ANY($1)',
      [steps.rows.map((s) => s.id)],
    );
    const services: ServiceDef[] = ordered.map((s) => ({
      id: s.id,
      bufferBeforeMin: s.buffer_before_min,
      bufferAfterMin: s.buffer_after_min,
      steps: steps.rows
        .filter((st) => st.service_id === s.id)
        .map((st) => ({
          durationMin: st.duration_min,
          staffBusy: st.staff_busy,
          requirements: reqs.rows
            .filter((r) => r.step_id === st.id)
            .map((r) => ({ poolId: r.pool_id, quantity: r.quantity })),
        })),
    }));

    const policyRow = await c.query<{
      slot_granularity_min: number;
      min_notice_min: number;
      max_advance_days: number;
      hold_ttl_sec: number;
      cancel_window_min: number;
      reschedule_window_min: number;
      max_future_bookings: number;
    }>(
      `SELECT slot_granularity_min, min_notice_min, max_advance_days, hold_ttl_sec, cancel_window_min,
              reschedule_window_min, max_future_bookings
         FROM booking_policies WHERE location_id = $1`,
      [location.id],
    );
    const p = policyRow.rows[0];
    const policy: BookingPolicy =
      p === undefined
        ? DEFAULT_POLICY
        : {
            slotGranularityMin: p.slot_granularity_min,
            minNoticeMin: p.min_notice_min,
            maxAdvanceDays: p.max_advance_days,
          };
    const rules: BookingRules =
      p === undefined
        ? DEFAULT_RULES
        : {
            holdTtlSec: p.hold_ttl_sec,
            cancelWindowMin: p.cancel_window_min,
            rescheduleWindowMin: p.reschedule_window_min,
            maxFutureBookings: p.max_future_bookings,
          };

    const windowRows = (sql: string, id: string) =>
      c.query<{
        owner: string;
        weekday: number;
        start_local: string;
        end_local: string;
        last_start_local: string | null;
        valid_from: string;
        valid_to: string | null;
      }>(sql, [id]);
    const toWindow = (h: Awaited<ReturnType<typeof windowRows>>['rows'][number]): WeeklyWindow => ({
      weekday: h.weekday as Weekday,
      start: hhmm(h.start_local),
      end: hhmm(h.end_local),
      ...(h.last_start_local === null ? {} : { lastStart: hhmm(h.last_start_local) }),
      validFrom: h.valid_from,
      ...(h.valid_to === null ? {} : { validTo: h.valid_to }),
    });
    const WINDOW_COLUMNS = `weekday, start_local::text, end_local::text, to_char(valid_from, 'YYYY-MM-DD') AS valid_from,
      to_char(valid_to, 'YYYY-MM-DD') AS valid_to`;
    const locationHours = await windowRows(
      `SELECT location_id AS owner, ${WINDOW_COLUMNS}, last_start_local::text FROM location_hours WHERE location_id = $1`,
      location.id,
    );

    const staffRows = await c.query<{ id: string; sort_order: number }>(
      `SELECT id, sort_order FROM resources
        WHERE location_id = $1 AND kind = 'staff' AND bookable_online AND archived_at IS NULL
        ORDER BY sort_order, id`,
      [location.id],
    );
    const working = await windowRows(
      `SELECT w.resource_id AS owner, ${WINDOW_COLUMNS}, NULL::text AS last_start_local
         FROM working_hours w JOIN resources r ON r.id = w.resource_id WHERE r.location_id = $1`,
      location.id,
    );
    const skills = await c.query<{ resource_id: string; service_id: string; duration_factor_pct: number }>(
      `SELECT ss.resource_id, ss.service_id, ss.duration_factor_pct
         FROM staff_services ss JOIN resources r ON r.id = ss.resource_id WHERE r.location_id = $1`,
      [location.id],
    );
    const staff: StaffDef[] = staffRows.rows.map((s) => ({
      id: s.id,
      sortOrder: s.sort_order,
      workingHours: working.rows.filter((w) => w.owner === s.id).map(toWindow),
      services: Object.fromEntries(
        skills.rows
          .filter((k) => k.resource_id === s.id)
          .map((k) => [k.service_id, { durationFactorPct: k.duration_factor_pct }]),
      ),
    }));

    const members = await c.query<{ pool_id: string; resource_id: string }>(
      `SELECT m.pool_id, m.resource_id FROM resource_pool_members m
         JOIN resource_pools p ON p.id = m.pool_id JOIN resources r ON r.id = m.resource_id
        WHERE p.location_id = $1 AND r.archived_at IS NULL ORDER BY r.sort_order, r.id`,
      [location.id],
    );
    const poolIds = [...new Set(members.rows.map((m) => m.pool_id))];
    const pools = poolIds.map((id) => ({
      id,
      resourceIds: members.rows.filter((m) => m.pool_id === id).map((m) => m.resource_id),
    }));

    // Margine di un giorno per lato: buffer e fasi a cavallo della mezzanotte non sfuggono.
    const rangeStart = new Date(zonedEpoch(req.from, 0, location.timezone) - DAY_MS);
    const rangeEnd = new Date(startOfNextDay(req.to, location.timezone) + DAY_MS);
    const exceptions = await c.query<{
      resource_id: string | null;
      kind: 'closed' | 'time_off' | 'extra_open';
      s: Date;
      e: Date;
    }>(
      `SELECT resource_id, kind, lower(during) AS s, upper(during) AS e FROM schedule_exceptions
        WHERE location_id = $1 AND during && tstzrange($2, $3, '[)')`,
      [location.id, rangeStart, rangeEnd],
    );
    // Gli hold scaduti ma non ancora ripuliti dal worker non occupano più l'agenda: createHold li fa scadere.
    const allocations = await c.query<{ resource_id: string; s: Date; e: Date }>(
      `SELECT a.resource_id, lower(a.during) AS s, upper(a.during) AS e FROM allocations a
        WHERE a.location_id = $1 AND a.active AND a.during && tstzrange($2, $3, '[)')
          AND NOT EXISTS (
            SELECT 1 FROM bookings b
             WHERE b.id = a.booking_id
               AND (b.id = $5::uuid
                    OR (b.status = 'held' AND (b.hold_expires_at <= $4 OR b.hold_session_hash = $6::bytea))))`,
      [
        location.id,
        rangeStart,
        rangeEnd,
        new Date(req.now),
        req.ignore?.bookingId ?? null,
        req.ignore?.holdSessionHash ?? null,
      ],
    );

    return {
      ok: true,
      location,
      services: ordered.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        priceCents: s.price_cents,
        priceIsFrom: s.price_is_from,
      })),
      rules,
      input: {
        timezone: location.timezone,
        policy,
        locationHours: locationHours.rows.map(toWindow),
        services,
        staff,
        staffPreference: { kind: 'any' },
        pools,
        exceptions: exceptions.rows.map((x) => ({
          resourceId: x.resource_id,
          kind: x.kind,
          interval: { start: x.s.getTime(), end: x.e.getTime() },
        })),
        allocations: allocations.rows.map((a) => ({
          resourceId: a.resource_id,
          interval: { start: a.s.getTime(), end: a.e.getTime() },
        })),
        now: req.now,
        from: req.from,
        to: req.to,
      },
    };
  });
}
