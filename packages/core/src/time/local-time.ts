import { Temporal } from 'temporal-polyfill';
import type { EpochMs, LocalDate, LocalTime, Weekday } from '../booking/types.js';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minuti dalla mezzanotte per un'ora 'HH:MM'. */
export function minutesOfTime(time: LocalTime): number {
  const m = TIME_RE.exec(time);
  if (m === null) throw new RangeError(`Ora non valida: ${time}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

function timeOfMinutes(min: number): LocalTime {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function plain(date: LocalDate, minutes: number): Temporal.PlainDateTime {
  return Temporal.PlainDate.from(date).toPlainDateTime(Temporal.PlainTime.from(timeOfMinutes(minutes)));
}

/** Confini delle fasce orarie: risoluzione standard di Temporal ('compatible'). */
export function zonedEpoch(date: LocalDate, minutes: number, timezone: string): EpochMs {
  return plain(date, minutes).toZonedDateTime(timezone, { disambiguation: 'compatible' }).epochMilliseconds;
}

/** Orari di INIZIO proposti al cliente: null se l'ora locale non esiste o è ambigua (cambio dell'ora legale). */
export function zonedEpochStrict(date: LocalDate, minutes: number, timezone: string): EpochMs | null {
  try {
    return plain(date, minutes).toZonedDateTime(timezone, { disambiguation: 'reject' }).epochMilliseconds;
  } catch (e) {
    if (e instanceof RangeError) return null;
    throw e;
  }
}

/** Inizio del giorno successivo (per le fasce che finiscono a mezzanotte). */
export function startOfNextDay(date: LocalDate, timezone: string): EpochMs {
  return Temporal.PlainDate.from(date).add({ days: 1 }).toZonedDateTime({ timeZone: timezone })
    .epochMilliseconds;
}

export function weekdayOf(date: LocalDate): Weekday {
  return Temporal.PlainDate.from(date).dayOfWeek as Weekday;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}

export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Temporal.PlainDate.from(from).until(Temporal.PlainDate.from(to), { largestUnit: 'days' }).days;
}

export function localDateOf(at: EpochMs, timezone: string): LocalDate {
  return Temporal.Instant.fromEpochMilliseconds(at).toZonedDateTimeISO(timezone).toPlainDate().toString();
}

export function isValidLocalDate(date: string): boolean {
  try {
    return Temporal.PlainDate.from(date, { overflow: 'reject' }).toString() === date;
  } catch {
    return false;
  }
}
