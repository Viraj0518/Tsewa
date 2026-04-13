import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    // No setupFiles — UI E2E tests are self-contained and don't need DB/Redis
    include: ['./src/__tests__/ui-e2e.test.ts'],
  },
});
