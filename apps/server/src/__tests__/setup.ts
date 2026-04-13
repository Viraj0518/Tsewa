import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

beforeAll(async () => {
  // Verify DB connection
  await prisma.$connect();
  console.log('[Test] Database connected');
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
  console.log('[Test] Cleanup complete');
});
