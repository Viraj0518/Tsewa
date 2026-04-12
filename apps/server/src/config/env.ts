import dotenv from 'dotenv';
import path from 'path';

// Load .env from server root, then from monorepo root as fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://tsewa:tsewa_local_2024@localhost:5432/tsewa',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'tsewa-jwt-secret-change-in-production-2024',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'tsewa-refresh-secret-change-in-production-2024',
  API_URL: process.env.API_URL || 'http://localhost:3001',
  PORT: parseInt(process.env.PORT || '3001', 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8081,http://localhost:19006,http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

export type Env = typeof env;
