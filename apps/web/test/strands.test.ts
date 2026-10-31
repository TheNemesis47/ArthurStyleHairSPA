import { describe, expect, it } from 'vitest';
import { buildStrands } from '../src/lib/strands';

describe('ciocche', () => {
  it('stesso numero di linee del logo (72 + 36) e output deterministico (server = client)', () => {
    const a = buildStrands();
    expect(a.filter((s) => s.group === 'main')).toHaveLength(72);
    expect(a.filter((s) => s.group === 'top')).toHaveLength(36);
    expect(buildStrands()).toEqual(a);
    for (const s of a) expect(s.d).toMatch(/^M-?\d+(\.\d)? -?\d+(\.\d)?C/);
  });
});
