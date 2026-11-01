import { defineConfig } from 'vitest/config';

// Test HTTP (inject) su PostgreSQL reale: richiedono DATABASE_URL di un'istanza di TEST, mai produzione.
export default defineConfig({
  test: {
    include: ['test-integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
