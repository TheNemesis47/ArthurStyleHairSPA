/**
 * Le "ciocche": linee sottili a ventaglio, lo stesso motivo dello sfondo del logo (brand/tools/build_brand.py).
 * Funzione pura e deterministica: stesso output lato server e client (niente mismatch di idratazione).
 */
export interface Strand {
  readonly d: string;
  readonly group: 'main' | 'top';
  readonly index: number;
}

const f = (n: number) => n.toFixed(1);

export function buildStrands(width = 910, mainCount = 72, topCount = 36): Strand[] {
  const out: Strand[] = [];
  for (let i = 0; i < mainCount; i++) {
    const t = i / (mainCount - 1);
    out.push({
      group: 'main',
      index: i,
      d: `M-20 ${f(25 + 400 * t)}C280 ${f(140 + 290 * t)} 640 ${f(300 + 170 * t)} ${f(width + 30)} ${f(300 + 330 * t)}`,
    });
  }
  for (let i = 0; i < topCount; i++) {
    const t = i / (topCount - 1);
    out.push({
      group: 'top',
      index: i,
      d: `M${f(380 + 420 * t)} -10C${f(650 + 100 * t)} ${f(40 + 30 * t)} 820 ${f(60 + 120 * t)} ${f(width + 30)} ${f(30 + 200 * t)}`,
    });
  }
  return out;
}
