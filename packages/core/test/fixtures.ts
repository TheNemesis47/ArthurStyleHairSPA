import { Temporal } from 'temporal-polyfill';
import type {
  AvailabilityInput,
  ExistingAllocation,
  ServiceDef,
  StaffDef,
  WeeklyWindow,
  Weekday,
} from '../src/booking/types.js';

export const TZ = 'Europe/Rome';

/** Istante di una data/ora locale a Firenze, con offset esplicito opzionale per i casi di ora legale. */
export const at = (local: string, tz = TZ): number =>
  Temporal.PlainDateTime.from(local).toZonedDateTime(tz, { disambiguation: 'reject' }).epochMilliseconds;

export const localHM = (ms: number, tz = TZ): string =>
  Temporal.Instant.fromEpochMilliseconds(ms)
    .toZonedDateTimeISO(tz)
    .toPlainTime()
    .toString({ smallestUnit: 'minute' });

export const week = (
  days: Weekday[],
  start: string,
  end: string,
  extra: Partial<WeeklyWindow> = {},
): WeeklyWindow[] => days.map((weekday) => ({ weekday, start, end, ...extra }));

export const SALON_HOURS: WeeklyWindow[] = [
  ...week([2, 3, 4, 5], '09:00', '19:00'),
  ...week([6], '09:00', '18:00'),
];

const P = [{ poolId: 'P', quantity: 1 }];
const L = [{ poolId: 'L', quantity: 1 }];

export const TAGLIO: ServiceDef = {
  id: 'taglio',
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  steps: [{ durationMin: 25, staffBusy: true, requirements: P }],
};
export const PIEGA: ServiceDef = {
  id: 'piega',
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  steps: [
    { durationMin: 10, staffBusy: true, requirements: L },
    { durationMin: 30, staffBusy: true, requirements: P },
  ],
};
/** Colore radici + piega: 25' applicazione, 35' POSA (operatore libero), 10' lavaggio, 35' piega, 5' riordino. */
export const COLORE: ServiceDef = {
  id: 'colore',
  bufferBeforeMin: 0,
  bufferAfterMin: 5,
  steps: [
    { durationMin: 25, staffBusy: true, requirements: P },
    { durationMin: 35, staffBusy: false, requirements: P },
    { durationMin: 10, staffBusy: true, requirements: L },
    { durationMin: 35, staffBusy: true, requirements: P },
  ],
};
export const ORA: ServiceDef = {
  id: 'ora',
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  steps: [{ durationMin: 60, staffBusy: true, requirements: [] }],
};
export const QUARTO: ServiceDef = {
  id: 'quarto',
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  steps: [{ durationMin: 15, staffBusy: true, requirements: [] }],
};
export const MEZZORA: ServiceDef = {
  id: 'mezzora',
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  steps: [{ durationMin: 30, staffBusy: true, requirements: [] }],
};

const ALL = ['taglio', 'piega', 'colore', 'ora', 'quarto', 'mezzora', 'posa-lunga'];
export const staff = (
  id: string,
  sortOrder: number,
  hours = SALON_HOURS,
  factors: Record<string, number> = {},
  only?: string[],
): StaffDef => ({
  id,
  sortOrder,
  workingHours: hours,
  services: Object.fromEntries((only ?? ALL).map((s) => [s, { durationFactorPct: factors[s] ?? 100 }])),
});

export const ARTURO = staff('arturo', 0);
export const POOLS = [
  { id: 'P', resourceIds: ['p1', 'p2', 'p3'] },
  { id: 'L', resourceIds: ['l1'] },
];

export const alloc = (resourceId: string, from: string, to: string): ExistingAllocation => ({
  resourceId,
  interval: { start: at(from), end: at(to) },
});

export function input(over: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    timezone: TZ,
    policy: { slotGranularityMin: 15, minNoticeMin: 0, maxAdvanceDays: 60 },
    locationHours: SALON_HOURS,
    services: [TAGLIO],
    staff: [ARTURO],
    staffPreference: { kind: 'any' },
    pools: POOLS,
    exceptions: [],
    allocations: [],
    now: at('2026-11-02T08:00'), // lunedì
    from: '2026-11-03', // martedì
    to: '2026-11-03',
    ...over,
  };
}
