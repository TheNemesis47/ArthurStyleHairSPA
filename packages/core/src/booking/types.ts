/** Millisecondi dall'epoca Unix (UTC). Il dominio ragiona in istanti; il fuso serve solo a costruirli. */
export type EpochMs = number;

/** Intervallo semiaperto [start, end): 10:00–10:30 e 10:30–11:00 NON si sovrappongono. */
export interface Interval {
  readonly start: EpochMs;
  readonly end: EpochMs;
}

/** Data locale della sede, formato ISO 'YYYY-MM-DD'. */
export type LocalDate = string;
/** Ora locale della sede, formato 'HH:MM'. */
export type LocalTime = string;
/** Giorno ISO: 1 = lunedì … 7 = domenica. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Fascia settimanale in ora locale (orari del salone o di un operatore). Più fasce nello stesso giorno = pausa. */
export interface WeeklyWindow {
  readonly weekday: Weekday;
  readonly start: LocalTime;
  readonly end: LocalTime;
  /** Ultimo orario di inizio accettato in questa fascia (solo per gli orari del salone). */
  readonly lastStart?: LocalTime;
  readonly validFrom?: LocalDate;
  readonly validTo?: LocalDate;
}

export interface BookingPolicy {
  readonly slotGranularityMin: number;
  readonly minNoticeMin: number;
  readonly maxAdvanceDays: number;
}

export interface PoolRequirement {
  readonly poolId: string;
  readonly quantity: number;
}

/** Fase di un servizio. staffBusy = false è il TEMPO DI POSA: l'operatore è libero, le risorse richieste no. */
export interface ServiceStep {
  readonly durationMin: number;
  readonly staffBusy: boolean;
  readonly requirements: readonly PoolRequirement[];
}

export interface ServiceDef {
  readonly id: string;
  readonly bufferBeforeMin: number;
  readonly bufferAfterMin: number;
  readonly steps: readonly ServiceStep[];
}

export interface StaffDef {
  readonly id: string;
  readonly sortOrder: number;
  readonly workingHours: readonly WeeklyWindow[];
  /** Servizi che l'operatore sa fare, con l'eventuale fattore di durata (100 = standard). */
  readonly services: Readonly<Record<string, { readonly durationFactorPct: number }>>;
}

export interface ResourcePool {
  readonly id: string;
  readonly resourceIds: readonly string[];
}

export type ExceptionKind = 'closed' | 'time_off' | 'extra_open';

export interface ScheduleException {
  /** null = tutto il salone. */
  readonly resourceId: string | null;
  readonly kind: ExceptionKind;
  readonly interval: Interval;
}

/** Allocazione attiva già presente (incluse quelle forzate: per il motore sono sempre occupate). */
export interface ExistingAllocation {
  readonly resourceId: string;
  readonly interval: Interval;
}

export type StaffPreference = { readonly kind: 'any' } | { readonly kind: 'staff'; readonly staffId: string };

export interface AvailabilityInput {
  readonly timezone: string;
  readonly policy: BookingPolicy;
  readonly locationHours: readonly WeeklyWindow[];
  /** Servizi nell'ordine in cui verranno eseguiti. */
  readonly services: readonly ServiceDef[];
  readonly staff: readonly StaffDef[];
  /** Dal sito e dall'app sempre { kind: 'any' } (Q21); un operatore preciso solo dal pannello. */
  readonly staffPreference: StaffPreference;
  readonly pools: readonly ResourcePool[];
  readonly exceptions: readonly ScheduleException[];
  readonly allocations: readonly ExistingAllocation[];
  readonly now: EpochMs;
  readonly from: LocalDate;
  readonly to: LocalDate;
}

export type AllocationKind = 'service' | 'processing' | 'buffer';

export interface Assignment {
  readonly resourceId: string;
  readonly interval: Interval;
  readonly kind: AllocationKind;
  /** Indice del servizio in AvailabilityInput.services. */
  readonly serviceIndex: number;
}

export interface Slot {
  /** Inizio dell'occupazione (incluso l'eventuale buffer iniziale). */
  readonly start: EpochMs;
  readonly end: EpochMs;
  /** Orario che vede il cliente (senza buffer). */
  readonly customerStart: EpochMs;
  readonly customerEnd: EpochMs;
  readonly staffId: string;
  /** Allocazioni da creare in caso di prenotazione: una per segmento × risorsa. */
  readonly assignments: readonly Assignment[];
}
