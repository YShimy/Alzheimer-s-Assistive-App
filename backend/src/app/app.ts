import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware } from '../shared/middleware/error.middleware.js';
import { logger } from '../shared/logger/logger.js';
import { registerRoutes } from './routes.js';

export function createApp() {
  const app = express();

  // ─── Global Middleware ──────────────────────────────
  app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to load across origins
  const allowedOrigins = (process.env.CLIENT_APP_URL ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: true, // reflect origin — allows all origins, safe for this API
      credentials: true,
    })
  );
  app.use(express.json());

  // Vercel: files are in /tmp/uploads/ (ephemeral). Local: uploads/ in project root.
  const uploadsDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : 'uploads';
  app.use('/uploads', express.static(uploadsDir));

  // ─── Request Logging ────────────────────────────────
  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url }, 'incoming request');
    next();
  });

  // ─── Health Check ───────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'memocare-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'memocare-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health/db', async (_req, res, next) => {
    try {
      const { prisma } = await import('../shared/db/prisma.js');
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  // ─── API Routes ─────────────────────────────────────
  registerRoutes(app);

  // ─── Error Handling ─────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
