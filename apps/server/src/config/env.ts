import dotenv from 'dotenv';
import path from 'path';

// Load .env from server root, then from monorepo root as fallback
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const DEFAULT_JWT_SECRET = 'tsewa-jwt-secret-change-in-production-2024';
const DEFAULT_JWT_REFRESH_SECRET = 'tsewa-refresh-secret-change-in-production-2024';

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://tsewa:tsewa_local_2024@localhost:5432/tsewa',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || DEFAULT_JWT_REFRESH_SECRET,
  API_URL: process.env.API_URL || 'http://localhost:3001',
  PORT: parseInt(process.env.PORT || '3001', 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8081,http://localhost:19006,http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET === DEFAULT_JWT_SECRET || env.JWT_REFRESH_SECRET === DEFAULT_JWT_REFRESH_SECRET) {
    console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set to non-default values in production.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL must be explicitly set in production.');
    process.exit(1);
  }
}

export type Env = typeof env;
