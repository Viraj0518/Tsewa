import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    // No setupFiles — PWA tests don't need Prisma/Redis
    include: ['./src/__tests__/pwa-responsive.test.ts'],
  },
});
