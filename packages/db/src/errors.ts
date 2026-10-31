/** SQLSTATE di PostgreSQL rilevanti per le prenotazioni. */
export const PG = {
  EXCLUSION_VIOLATION: '23P01',
  CHECK_VIOLATION: '23514',
  DEADLOCK_DETECTED: '40P01',
  LOCK_NOT_AVAILABLE: '55P03',
} as const;

/** Nome del vincolo violato (es. 'allocations_no_overlap' vs 'bookings_customer_no_overlap'). */
export function pgConstraint(e: unknown): string | undefined {
  if (typeof e === 'object' && e !== null && 'constraint' in e && typeof e.constraint === 'string')
    return e.constraint;
  return undefined;
}

export function pgCode(e: unknown): string | undefined {
  if (typeof e === 'object' && e !== null && 'code' in e && typeof e.code === 'string') return e.code;
  return undefined;
}
