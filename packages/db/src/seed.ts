import { readFileSync } from 'node:fs';
import type pg from 'pg';
import { parse } from 'yaml';
import { z } from 'zod';
import { withOrgTx } from './tx.ts';

/**
 * Dati di prova (docs/21 §Seed): organizzazione, sedi, orari, policy, operatori, pool di postazioni e listino.
 * Solo per sviluppo, test e staging: in produzione i dati veri li inserisce Arturo dal pannello.
 * La fonte è il blocco YAML di docs/21, validato qui con zod prima di scrivere nel database.
 */

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const slug = z.string().regex(/^[a-z0-9-]{2,60}$/);
const e164 = z.string().regex(/^\+[1-9]\d{6,14}$/);

const LocationSeed = z.object({
  slug,
  name: z.string().min(1),
  country_code: z.enum(['IT', 'MT']),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  vat_rate_bp: z.number().int().min(0).max(10000),
  status: z.enum(['draft', 'active', 'closing', 'closed']),
  address: z.record(z.string(), z.unknown()).default({}),
  phone_e164: e164.optional(),
  whatsapp_e164: e164.optional(),
  hours: z
    .array(
      z.object({
        weekday: z.number().int().min(1).max(7),
        open: time,
        close: time,
        last_start: time.optional(),
      }),
    )
    .default([]),
  policy: z
    .object({
      min_notice_min: z.number().int().min(0),
      max_advance_days: z.number().int().min(1).max(365),
      cancel_window_min: z.number().int().min(0),
      reschedule_window_min: z.number().int().min(0),
      require_contact_otp: z.enum(['never', 'new_customers', 'always']),
      reminder_offsets_min: z.array(z.number().int().positive()),
      slot_granularity_min: z.literal([5, 10, 15, 20, 30, 60]),
      hold_ttl_sec: z.number().int().min(60).max(1800),
      max_future_bookings: z.number().int().min(1),
    })
    .optional(),
  resources: z.object({
    staff: z.array(z.object({ name: z.string().min(1), role: z.enum(['owner', 'staff']) })),
    pools: z.record(z.string(), z.array(z.string().min(1))).default({}),
  }),
});

/** Passo: [durata in minuti, operatore impegnato, pool richiesto ('P' poltrone, 'L' lavatesta) o null]. */
const Step = z.tuple([z.number().int().positive().multipleOf(5), z.boolean(), z.enum(['P', 'L']).nullable()]);

const ServiceSeed = z.object({
  slug,
  cat: slug,
  it: z.string().min(1),
  en: z.string().min(1),
  price: z.number().int().min(0),
  from: z.boolean(),
  online: z.boolean().default(true),
  buffer_before: z.number().int().min(0).max(120).default(0),
  buffer_after: z.number().int().min(0).max(120).default(0),
  steps: z.array(Step).min(1),
});

export const SeedData = z.object({
  organization: z.object({ slug, name: z.string().min(1) }),
  locations: z.array(LocationSeed).min(1),
  services: z.array(ServiceSeed),
});
export type SeedData = z.infer<typeof SeedData>;

/** Nomi delle categorie del listino (gli stessi del sito, apps/web/src/content/listino.ts). */
export const CATEGORY_NAMES: Readonly<Record<string, { it: string; en: string }>> = {
  'taglio-piega': { it: 'Taglio e piega', en: 'Cut & blow-dry' },
  colore: { it: 'Colore', en: 'Colour' },
  'hair-spa': { it: 'Hair Spa', en: 'Hair Spa' },
  acconciature: { it: 'Acconciature', en: 'Styling' },
  consulenza: { it: 'Consulenza', en: 'Consultation' },
};

/** Codici dei pool nei passi del listino → nome del pool nella sede. */
const POOL_CODES = { P: 'Poltrone', L: 'Lavatesta' } as const;

/** Legge e valida il blocco YAML di docs/21. */
export function readMockSeed(markdownPath: string): SeedData {
  const doc = readFileSync(markdownPath, 'utf8');
  const block = /```yaml\n([\s\S]*?)```/.exec(doc)?.[1];
  if (block === undefined) throw new Error(`Nessun blocco YAML in ${markdownPath}`);
  return SeedData.parse(parse(block));
}

/**
 * Scrive i dati in un database vuoto e restituisce l'id dell'organizzazione. Il listino va nelle sedi che hanno i
 * pool richiesti dai passi (oggi solo Firenze: Malta è una bozza senza postazioni). Tutto in una transazione.
 */
export async function seed(pool: pg.Pool, data: SeedData): Promise<string> {
  const existing = await pool.query('SELECT 1 FROM organizations WHERE slug = $1', [data.organization.slug]);
  if ((existing.rowCount ?? 0) > 0)
    throw new Error(`Organizzazione '${data.organization.slug}' già presente`);
  const org = await pool.query<{ id: string }>(
    'INSERT INTO organizations (slug, name) VALUES ($1, $2) RETURNING id',
    [data.organization.slug, data.organization.name],
  );
  const organizationId = org.rows[0]?.id;
  if (organizationId === undefined) throw new Error('Inserimento organizzazione fallito');

  await withOrgTx(pool, organizationId, async (c) => {
    for (const l of data.locations) {
      const loc = await c.query<{ id: string }>(
        `INSERT INTO locations (organization_id, slug, name, country_code, timezone, currency, vat_rate_bp, status,
                                address, phone_e164, whatsapp_e164)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [
          organizationId,
          l.slug,
          l.name,
          l.country_code,
          l.timezone,
          l.currency,
          l.vat_rate_bp,
          l.status,
          l.address,
          l.phone_e164 ?? null,
          l.whatsapp_e164 ?? null,
        ],
      );
      const locationId = loc.rows[0]?.id;
      if (locationId === undefined) throw new Error(`Inserimento sede ${l.slug} fallito`);

      if (l.policy !== undefined) {
        const p = l.policy;
        await c.query(
          `INSERT INTO booking_policies (location_id, slot_granularity_min, min_notice_min, max_advance_days, hold_ttl_sec,
             cancel_window_min, reschedule_window_min, max_future_bookings, require_contact_otp, reminder_offsets_min)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            locationId,
            p.slot_granularity_min,
            p.min_notice_min,
            p.max_advance_days,
            p.hold_ttl_sec,
            p.cancel_window_min,
            p.reschedule_window_min,
            p.max_future_bookings,
            p.require_contact_otp,
            p.reminder_offsets_min,
          ],
        );
      }
      // valid_from esplicito e lontano nel passato: il seed non dipende dalla data in cui gira
      for (const h of l.hours)
        await c.query(
          `INSERT INTO location_hours (location_id, weekday, start_local, end_local, last_start_local, valid_from)
           VALUES ($1, $2, $3, $4, $5, '2000-01-01')`,
          [locationId, h.weekday, h.open, h.close, h.last_start ?? null],
        );

      // Operatori: lavorano negli orari del salone (docs/21 §Risorse)
      const staffIds: string[] = [];
      for (const [i, s] of l.resources.staff.entries()) {
        const r = await c.query<{ id: string }>(
          `INSERT INTO resources (location_id, kind, name, sort_order) VALUES ($1, 'staff', $2, $3) RETURNING id`,
          [locationId, s.name, i],
        );
        const id = r.rows[0]?.id;
        if (id === undefined) throw new Error('Inserimento operatore fallito');
        staffIds.push(id);
        for (const h of l.hours)
          await c.query(
            `INSERT INTO working_hours (resource_id, weekday, start_local, end_local, valid_from)
             VALUES ($1, $2, $3, $4, '2000-01-01')`,
            [id, h.weekday, h.open, h.close],
          );
      }

      const poolIds = new Map<string, string>();
      let order = 100;
      for (const [poolName, members] of Object.entries(l.resources.pools)) {
        const p = await c.query<{ id: string }>(
          'INSERT INTO resource_pools (location_id, name) VALUES ($1, $2) RETURNING id',
          [locationId, poolName],
        );
        const poolId = p.rows[0]?.id;
        if (poolId === undefined) throw new Error('Inserimento pool fallito');
        poolIds.set(poolName, poolId);
        for (const name of members) {
          const r = await c.query<{ id: string }>(
            `INSERT INTO resources (location_id, kind, name, sort_order) VALUES ($1, 'station', $2, $3) RETURNING id`,
            [locationId, name, order++],
          );
          await c.query('INSERT INTO resource_pool_members (pool_id, resource_id) VALUES ($1, $2)', [
            poolId,
            r.rows[0]?.id,
          ]);
        }
      }

      const canHost = (s: z.infer<typeof ServiceSeed>) =>
        s.steps.every(([, , code]) => code === null || poolIds.has(POOL_CODES[code]));
      const services = data.services.filter(canHost);
      if (services.length === 0) continue;

      const categoryIds = new Map<string, string>();
      for (const [i, key] of [...new Set(services.map((s) => s.cat))].entries()) {
        const name = CATEGORY_NAMES[key] ?? { it: key, en: key };
        const cat = await c.query<{ id: string }>(
          'INSERT INTO service_categories (location_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id',
          [locationId, name, i],
        );
        const catId = cat.rows[0]?.id;
        if (catId !== undefined) categoryIds.set(key, catId);
      }

      for (const [i, s] of services.entries()) {
        const svc = await c.query<{ id: string }>(
          `INSERT INTO services (location_id, category_id, slug, name, price_cents, price_is_from, buffer_before_min,
                                 buffer_after_min, online_bookable, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [
            locationId,
            categoryIds.get(s.cat) ?? null,
            s.slug,
            { it: s.it, en: s.en },
            s.price,
            s.from,
            s.buffer_before,
            s.buffer_after,
            s.online,
            i,
          ],
        );
        const serviceId = svc.rows[0]?.id;
        if (serviceId === undefined) throw new Error(`Inserimento servizio ${s.slug} fallito`);
        for (const [position, [durationMin, staffBusy, code]] of s.steps.entries()) {
          const st = await c.query<{ id: string }>(
            `INSERT INTO service_steps (service_id, position, duration_min, staff_busy) VALUES ($1, $2, $3, $4) RETURNING id`,
            [serviceId, position, durationMin, staffBusy],
          );
          if (code !== null)
            await c.query('INSERT INTO service_step_requirements (step_id, pool_id) VALUES ($1, $2)', [
              st.rows[0]?.id,
              poolIds.get(POOL_CODES[code]),
            ]);
        }
        for (const staffId of staffIds)
          await c.query('INSERT INTO staff_services (resource_id, service_id) VALUES ($1, $2)', [
            staffId,
            serviceId,
          ]);
      }
    }
  });
  return organizationId;
}

// Uso (solo sviluppo/staging, MAI produzione): DATABASE_URL=postgresql://… node src/seed.ts
if (import.meta.url === `file://${process.argv[1] ?? ''}`) {
  const url = process.env['DATABASE_URL'];
  if (url === undefined || url === '') throw new Error('DATABASE_URL mancante');
  const { default: pgModule } = await import('pg');
  const pool = new pgModule.Pool({ connectionString: url, max: 2 });
  try {
    const doc = new URL('../../../docs/21-dati-mock.md', import.meta.url).pathname;
    const id = await seed(pool, readMockSeed(doc));
    console.log(`Dati di prova caricati (organizzazione ${id})`);
  } finally {
    await pool.end();
  }
}
