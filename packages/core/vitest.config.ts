import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // i test di proprietà calcolano centinaia di agende: con la copertura attiva servono più di 5 s
    testTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // CONSTRAINTS C-02: rami ≥ 95 % sul motore di prenotazione
      thresholds: { 'src/booking/**': { branches: 95, lines: 95, functions: 95, statements: 95 } },
    },
  },
});
