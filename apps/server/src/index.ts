import dotenv from 'dotenv';
import path from 'path';

// Load env files before anything else
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import fs from 'fs';

import { env } from './config/env';
import routes from './routes';
import { setupSocket } from './socket';

const app = express();

// ========================
// Middleware
// ========================

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ========================
// Static uploads
// ========================

const uploadsDir = path.resolve(env.UPLOAD_DIR);
const photosDir = path.join(uploadsDir, 'photos');
const voiceDir = path.join(uploadsDir, 'voice');

// Ensure upload directories exist
for (const dir of [uploadsDir, photosDir, voiceDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

app.use('/uploads', express.static(uploadsDir));

// ========================
// Routes
// ========================

app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Tsewa API',
    version: '1.0.0',
    status: 'running',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  if (err.message.includes('Multer') || err.message.includes('File too large')) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

// ========================
// Server + Socket.io
// ========================

const httpServer = createServer(app);
const io = setupSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║         Tsewa API Server             ║
  ╠══════════════════════════════════════╣
  ║  HTTP:   http://localhost:${env.PORT}      ║
  ║  Socket: ws://localhost:${env.PORT}        ║
  ║  Env:    ${env.NODE_ENV.padEnd(25)}║
  ╚══════════════════════════════════════╝
  `);
});

export { app, httpServer, io };
