import { defineConfig } from 'vitest/config';

// Test su PostgreSQL reale: richiedono DATABASE_URL (superutente di un'istanza di test, MAI produzione).
export default defineConfig({
  test: {
    include: ['test-integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
