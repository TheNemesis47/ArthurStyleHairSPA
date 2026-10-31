import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { IntervalSet } from '../src/booking/interval-set.js';

const iv = (start: number, end: number) => ({ start, end });

describe('IntervalSet', () => {
  it('normalizza: ordina, scarta i vuoti e fonde sovrapposti e adiacenti', () => {
    const s = IntervalSet.of([iv(30, 40), iv(10, 20), iv(20, 25), iv(5, 5), iv(38, 50)]);
    expect(s.toArray()).toEqual([iv(10, 25), iv(30, 50)]);
  });

  it('rifiuta intervalli invertiti', () => {
    expect(() => IntervalSet.of([iv(10, 5)])).toThrow(RangeError);
  });

  it('unione, intersezione e differenza', () => {
    const a = IntervalSet.of([iv(0, 10), iv(20, 30)]);
    const b = IntervalSet.of([iv(5, 25)]);
    expect(a.union(b).toArray()).toEqual([iv(0, 30)]);
    expect(a.intersect(b).toArray()).toEqual([iv(5, 10), iv(20, 25)]);
    expect(a.subtract(b).toArray()).toEqual([iv(0, 5), iv(25, 30)]);
    expect(b.subtract(a).toArray()).toEqual([iv(10, 20)]);
  });

  it('contains: intervallo semiaperto [start, end)', () => {
    const s = IntervalSet.of([iv(0, 10), iv(10, 20)]); // fusi in [0,20)
    expect(s.contains(iv(0, 20))).toBe(true);
    expect(s.contains(iv(15, 21))).toBe(false);
    expect(s.contains(iv(5, 5))).toBe(true); // intervallo vuoto: sempre contenuto
    expect(IntervalSet.empty().isEmpty()).toBe(true);
  });

  it('overlaps: gli intervalli che si toccano non si sovrappongono', () => {
    const s = IntervalSet.of([iv(10, 20)]);
    expect(s.overlaps(iv(20, 30))).toBe(false);
    expect(s.overlaps(iv(0, 10))).toBe(false);
    expect(s.overlaps(iv(19, 21))).toBe(true);
    expect(s.overlaps(iv(12, 12))).toBe(false);
  });

  // Proprietà: confronto con un modello a "minuti" (insieme di punti interi)
  const arbSet = fc
    .array(fc.tuple(fc.integer({ min: 0, max: 60 }), fc.integer({ min: 0, max: 20 })), { maxLength: 6 })
    .map((xs) => xs.map(([s, len]) => iv(s, s + len)));
  const points = (s: IntervalSet) => {
    const out = new Set<number>();
    for (const i of s.toArray()) for (let p = i.start; p < i.end; p++) out.add(p);
    return out;
  };

  it('proprietà: le operazioni coincidono con le operazioni insiemistiche sui punti', () => {
    fc.assert(
      fc.property(arbSet, arbSet, (xa, xb) => {
        const a = IntervalSet.of(xa),
          b = IntervalSet.of(xb);
        const pa = points(a),
          pb = points(b);
        expect(points(a.union(b))).toEqual(new Set([...pa, ...pb]));
        expect(points(a.intersect(b))).toEqual(new Set([...pa].filter((p) => pb.has(p))));
        expect(points(a.subtract(b))).toEqual(new Set([...pa].filter((p) => !pb.has(p))));
        // forma normale: disgiunti, ordinati, non adiacenti, non vuoti
        const arr = a.union(b).toArray();
        for (let k = 1; k < arr.length; k++) expect(arr[k]!.start).toBeGreaterThan(arr[k - 1]!.end);
        for (const i of arr) expect(i.end).toBeGreaterThan(i.start);
      }),
    );
  });
});
