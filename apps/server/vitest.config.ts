import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['./src/__tests__/**/*.test.ts'],
    // UI E2E tests run against the deployed site and don't need DB setup
    exclude: ['./src/__tests__/ui-e2e.test.ts'],
  },
});
