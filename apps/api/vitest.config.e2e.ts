import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // DATABASE_URL comes from .env or the CI environment; everything else is fixed for tests.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-secret-that-is-long-enough-for-hs256',
      MAIL_TRANSPORT: 'log',
    },
  },
});
