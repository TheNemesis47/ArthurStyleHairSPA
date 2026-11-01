import { IntervalSet } from './interval-set.ts';
import { buildTemplate, type Segment, type Template } from './template.ts';
import type {
  Assignment,
  AvailabilityInput,
  EpochMs,
  Interval,
  LocalDate,
  ResourcePool,
  ScheduleException,
  Slot,
  StaffDef,
  WeeklyWindow,
} from './types.ts';
import {
  addDays,
  daysBetween,
  isValidLocalDate,
  localDateOf,
  minutesOfTime,
  startOfNextDay,
  weekdayOf,
  zonedEpoch,
  zonedEpochStrict,
} from '../time/local-time.ts';

const MINUTE = 60_000;

interface Candidate {
  readonly staff: StaffDef;
  readonly template: Template;
}
export const MAX_RANGE_DAYS = 31;

/**
 * Calcola gli slot prenotabili (docs/06 §3). Funzione PURA: nessun I/O, nessun orologio di sistema.
 * È un'ottimizzazione di esperienza utente: la garanzia contro le doppie prenotazioni resta il vincolo EXCLUDE del DB.
 */
export function computeAvailability(input: AvailabilityInput): Slot[] {
  validate(input);
  const { timezone, policy } = input;
  const grid = policy.slotGranularityMin;
  const earliest = input.now + policy.minNoticeMin * MINUTE;
  const lastBookableDate = addDays(localDateOf(input.now, timezone), policy.maxAdvanceDays);
  const poolById = new Map<string, ResourcePool>(input.pools.map((p) => [p.id, p]));

  const pref = input.staffPreference;
  // operatori ammessi: quello richiesto (solo pannello) o tutti, purché abilitati a TUTTI i servizi scelti
  const candidates: Candidate[] = input.staff.flatMap((staff) => {
    if (pref.kind === 'staff' && staff.id !== pref.staffId) return [];
    const factors = input.services.map((svc) => staff.services[svc.id]?.durationFactorPct);
    if (!factors.every((f): f is number => f !== undefined)) return [];
    return [{ staff, template: buildTemplate(input.services, factors) }];
  });

  const busyByResource = groupAllocations(input);
  const slots: Slot[] = [];

  for (let date = input.from; daysBetween(date, input.to) >= 0; date = addDays(date, 1)) {
    if (daysBetween(date, lastBookableDate) < 0) break;
    const dayStart = zonedEpoch(date, 0, timezone);
    const dayEnd = startOfNextDay(date, timezone);
    const day: Interval = { start: dayStart, end: dayEnd };

    const locationOpen = applyExceptions(
      windowsFor(input.locationHours, date, timezone),
      input.exceptions,
      null,
      day,
    );
    if (locationOpen.isEmpty()) continue;
    const lastStartMin = lastStartFor(input.locationHours, date);

    const daily = candidates.map((c) => {
      const working = applyExceptions(
        windowsFor(c.staff.workingHours, date, timezone),
        input.exceptions,
        c.staff.id,
        day,
      );
      const busy = busyByResource.get(c.staff.id) ?? IntervalSet.empty();
      return { ...c, free: working.intersect(locationOpen).subtract(busy), load: minutesWithin(busy, day) };
    });
    // bilanciamento del carico: prima chi ha meno minuti già occupati quel giorno (docs/06 §3, passo 5)
    daily.sort(
      (a, b) =>
        a.load - b.load || a.staff.sortOrder - b.staff.sortOrder || a.staff.id.localeCompare(b.staff.id),
    );
    const resourceFree = (resourceId: string): IntervalSet => {
      const own = applyExceptions(locationOpen, input.exceptions, resourceId, day, false);
      return own.subtract(busyByResource.get(resourceId) ?? IntervalSet.empty());
    };
    const freeCache = new Map<string, IntervalSet>();
    const freeOf = (id: string) => {
      let f = freeCache.get(id);
      if (f === undefined) freeCache.set(id, (f = resourceFree(id)));
      return f;
    };

    for (let minute = 0; minute < 24 * 60; minute += grid) {
      if (lastStartMin !== null && minute > lastStartMin) break;
      const start = zonedEpochStrict(date, minute, timezone);
      if (start === null || start < earliest) continue;

      for (const c of daily) {
        const slot = tryPlace(
          start,
          c.staff,
          c.template,
          c.free,
          locationOpen,
          poolById,
          freeOf,
          date,
          timezone,
        );
        if (slot !== null) {
          slots.push(slot);
          break; // un solo slot per orario di inizio: l'operatore lo sceglie il sistema
        }
      }
    }
  }
  return slots;
}

function tryPlace(
  start: EpochMs,
  staff: StaffDef,
  tpl: Template,
  staffFree: IntervalSet,
  locationOpen: IntervalSet,
  poolById: ReadonlyMap<string, ResourcePool>,
  freeOf: (resourceId: string) => IntervalSet,
  date: LocalDate,
  timezone: string,
): Slot | null {
  const end = start + tpl.totalMin * MINUTE;
  // E14: un appuntamento si svolge in un solo giorno locale
  if (localDateOf(end - 1, timezone) !== date) return null;
  // E4/E5: il salone deve essere aperto per tutta la durata (anche durante la posa)
  if (!locationOpen.contains({ start, end })) return null;

  const assignments: Assignment[] = [];
  const lastUsed = new Map<string, string>(); // serviceIndex:poolId → risorsa usata nel segmento precedente
  for (const seg of tpl.segments) {
    const interval = segmentInterval(start, seg);
    if (seg.staffBusy) {
      if (!staffFree.contains(interval)) return null;
      assignments.push({ resourceId: staff.id, interval, kind: seg.kind, serviceIndex: seg.serviceIndex });
    }
    const takenHere = new Set<string>();
    for (const req of seg.requirements) {
      const pool = poolById.get(req.poolId);
      if (pool === undefined) throw new RangeError(`Pool sconosciuto: ${req.poolId}`);
      const key = `${String(seg.serviceIndex)}:${pool.id}`;
      const preferred = lastUsed.get(key);
      const order =
        preferred !== undefined && pool.resourceIds.includes(preferred)
          ? [preferred, ...pool.resourceIds.filter((r) => r !== preferred)]
          : pool.resourceIds;
      let found = 0;
      for (const rid of order) {
        if (found === req.quantity) break;
        if (takenHere.has(rid) || !freeOf(rid).contains(interval)) continue;
        takenHere.add(rid);
        lastUsed.set(key, rid);
        assignments.push({ resourceId: rid, interval, kind: seg.kind, serviceIndex: seg.serviceIndex });
        found++;
      }
      if (found < req.quantity) return null;
    }
  }
  return {
    start,
    end,
    customerStart: start + tpl.customerStartMin * MINUTE,
    customerEnd: start + tpl.customerEndMin * MINUTE,
    staffId: staff.id,
    assignments,
  };
}

function segmentInterval(start: EpochMs, seg: Segment): Interval {
  return { start: start + seg.offsetStartMin * MINUTE, end: start + seg.offsetEndMin * MINUTE };
}

function activeOn(w: WeeklyWindow, date: LocalDate): boolean {
  if (w.weekday !== weekdayOf(date)) return false;
  if (w.validFrom !== undefined && daysBetween(w.validFrom, date) < 0) return false;
  if (w.validTo !== undefined && daysBetween(date, w.validTo) < 0) return false;
  return true;
}

function windowsFor(windows: readonly WeeklyWindow[], date: LocalDate, timezone: string): IntervalSet {
  return IntervalSet.of(
    windows
      .filter((w) => activeOn(w, date))
      .map((w) => ({
        start: zonedEpoch(date, minutesOfTime(w.start), timezone),
        end: zonedEpoch(date, minutesOfTime(w.end), timezone),
      })),
  );
}

function lastStartFor(windows: readonly WeeklyWindow[], date: LocalDate): number | null {
  const values = windows.flatMap((w) =>
    activeOn(w, date) && w.lastStart !== undefined ? [minutesOfTime(w.lastStart)] : [],
  );
  return values.length === 0 ? null : Math.max(...values);
}

/**
 * Applica le eccezioni del giorno a un insieme di orari.
 * resourceId = null → solo eccezioni di tutto il salone; altrimenti salone + risorsa
 * (un'apertura straordinaria del salone vale anche per gli operatori; una chiusura del salone chiude tutti).
 * includeLocationWide = false → solo quelle specifiche della risorsa (il salone è già applicato a monte).
 */
function applyExceptions(
  base: IntervalSet,
  exceptions: readonly ScheduleException[],
  resourceId: string | null,
  day: Interval,
  includeLocationWide = true,
): IntervalSet {
  const relevant = exceptions.filter(
    (e) =>
      e.interval.start < day.end &&
      e.interval.end > day.start &&
      (e.resourceId === resourceId || (includeLocationWide && resourceId !== null && e.resourceId === null)),
  );
  const extra = IntervalSet.of(relevant.filter((e) => e.kind === 'extra_open').map((e) => e.interval));
  const closed = IntervalSet.of(relevant.filter((e) => e.kind !== 'extra_open').map((e) => e.interval));
  return base.union(extra).subtract(closed);
}

function groupAllocations(input: AvailabilityInput): Map<string, IntervalSet> {
  const byResource = new Map<string, Interval[]>();
  for (const a of input.allocations) {
    const list = byResource.get(a.resourceId) ?? [];
    list.push(a.interval);
    byResource.set(a.resourceId, list);
  }
  return new Map([...byResource].map(([id, list]) => [id, IntervalSet.of(list)]));
}

function minutesWithin(set: IntervalSet, day: Interval): number {
  return set
    .intersect(IntervalSet.of([day]))
    .toArray()
    .reduce((sum, i) => sum + (i.end - i.start) / MINUTE, 0);
}

function validate(input: AvailabilityInput): void {
  if (!isValidLocalDate(input.from) || !isValidLocalDate(input.to)) throw new RangeError('Date non valide');
  const span = daysBetween(input.from, input.to);
  if (span < 0) throw new RangeError('from è successiva a to');
  if (span >= MAX_RANGE_DAYS) throw new RangeError(`Intervallo massimo ${String(MAX_RANGE_DAYS)} giorni`);
  const g = input.policy.slotGranularityMin;
  if (!Number.isInteger(g) || g <= 0 || (24 * 60) % g !== 0) throw new RangeError('Granularità non valida');
  if (input.services.length === 0) throw new RangeError('Serve almeno un servizio');
}
