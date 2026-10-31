import type { Interval } from './types.js';

/**
 * Insieme di intervalli semiaperti [start, end) in forma normale: ordinati, disgiunti, non adiacenti, non vuoti.
 * Immutabile. È la base di tutto il calcolo di disponibilità (orari − eccezioni − allocazioni).
 */
export class IntervalSet {
  private constructor(private readonly items: readonly Interval[]) {}

  static empty(): IntervalSet {
    return new IntervalSet([]);
  }

  static of(intervals: Iterable<Interval>): IntervalSet {
    const sorted: Interval[] = [];
    for (const i of intervals) {
      if (i.end < i.start)
        throw new RangeError(`Intervallo invertito: [${String(i.start)}, ${String(i.end)})`);
      if (i.end > i.start) sorted.push({ start: i.start, end: i.end });
    }
    sorted.sort((a, b) => a.start - b.start || a.end - b.end);
    const out: Interval[] = [];
    for (const i of sorted) {
      const last = out[out.length - 1];
      if (last !== undefined && i.start <= last.end) {
        out[out.length - 1] = { start: last.start, end: Math.max(last.end, i.end) };
      } else {
        out.push(i);
      }
    }
    return new IntervalSet(out);
  }

  toArray(): readonly Interval[] {
    return this.items;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  union(other: IntervalSet): IntervalSet {
    return IntervalSet.of([...this.items, ...other.items]);
  }

  intersect(other: IntervalSet): IntervalSet {
    const out: Interval[] = [];
    let i = 0;
    let j = 0;
    const a = this.items;
    const b = other.items;
    for (;;) {
      const x = a[i];
      const y = b[j];
      if (x === undefined || y === undefined) break;
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (start < end) out.push({ start, end });
      if (x.end < y.end) i++;
      else j++;
    }
    return new IntervalSet(out);
  }

  subtract(other: IntervalSet): IntervalSet {
    const out: Interval[] = [];
    let j = 0;
    const b = other.items;
    for (const x of this.items) {
      let cursor = x.start;
      while ((b[j]?.end ?? Infinity) <= cursor) j++;
      for (let k = j; ; k++) {
        const y = b[k];
        if (y === undefined || y.start >= x.end) break;
        if (y.start > cursor) out.push({ start: cursor, end: y.start });
        cursor = Math.max(cursor, y.end);
        if (cursor >= x.end) break;
      }
      if (cursor < x.end) out.push({ start: cursor, end: x.end });
    }
    return new IntervalSet(out);
  }

  /** true se l'intero intervallo è coperto da un unico tratto dell'insieme. */
  contains(interval: Interval): boolean {
    if (interval.end <= interval.start) return true;
    return this.items.some((i) => i.start <= interval.start && interval.end <= i.end);
  }

  /** true se l'intervallo condivide almeno un istante con l'insieme. */
  overlaps(interval: Interval): boolean {
    if (interval.end <= interval.start) return false;
    return this.items.some((i) => i.start < interval.end && interval.start < i.end);
  }
}
