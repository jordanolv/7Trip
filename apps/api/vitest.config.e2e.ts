import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Test files share one database: run them one after another.
    fileParallelism: false,
    // Real HTTP and database round trips: a long scenario can pass 5 s on a busy machine.
    testTimeout: 20_000,
    // DATABASE_URL comes from .env or the CI environment; everything else is fixed for tests.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-secret-that-is-long-enough-for-hs256',
      MAIL_TRANSPORT: 'log',
      RATES_SOURCE: 'fixed',
      STORAGE_DRIVER: 'local',
      STORAGE_DIR: '.storage-test',
      PUSH_DRIVER: 'memory',
      NOTIFICATIONS_WORKER: 'false',
    },
  },
});
