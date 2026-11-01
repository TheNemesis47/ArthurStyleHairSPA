import type pg from 'pg';
import { addDays, computeAvailability, localDateOf, toZonedIso, type Clock } from '@arthur/core';
import { loadAvailabilityInput, type AvailabilityRequest } from '@arthur/db';

const ALTERNATIVES = 3;
const ALTERNATIVES_DAYS = 7;

/**
 * I 3 orari liberi più vicini a quello chiesto, nei 7 giorni da quella data (stesso motore): con un 409 l'utente
 * non riparte da zero (docs/06 §4). `ignore` come in loadAvailabilityInput (hold della sessione, prenotazione spostata).
 */
export async function nearestSlots(
  pool: pg.Pool,
  organizationId: string,
  clock: Clock,
  req: {
    readonly location: string;
    readonly services: readonly string[];
    readonly startMs: number;
    readonly timezone: string;
    readonly ignore: NonNullable<AvailabilityRequest['ignore']>;
  },
): Promise<{ start: string; end: string }[]> {
  const from = localDateOf(req.startMs, req.timezone);
  const load = await loadAvailabilityInput(pool, organizationId, {
    locationSlug: req.location,
    serviceSlugs: req.services,
    from,
    to: addDays(from, ALTERNATIVES_DAYS - 1),
    now: clock.now(),
    ignore: req.ignore,
  });
  if (!load.ok) return [];
  const seen = new Map<number, number>();
  for (const s of computeAvailability(load.input))
    if (s.customerStart !== req.startMs && !seen.has(s.customerStart))
      seen.set(s.customerStart, s.customerEnd);
  return [...seen.entries()]
    .sort((a, b) => Math.abs(a[0] - req.startMs) - Math.abs(b[0] - req.startMs) || a[0] - b[0])
    .slice(0, ALTERNATIVES)
    .sort((a, b) => a[0] - b[0])
    .map(([s, e]) => ({ start: toZonedIso(s, req.timezone), end: toZonedIso(e, req.timezone) }));
}
