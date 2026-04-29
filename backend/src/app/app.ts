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
  app.use(cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    credentials: true,
  }));
  app.use(express.json());
  
  // ─── Static files for media storage ─────────────────
  // Vercel: files are in /tmp/uploads/ (ephemeral). Local: uploads/ in project root.
  const uploadsDir = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : 'uploads';
  app.use('/uploads', express.static(uploadsDir));

  // ─── Request Logging ────────────────────────────────
  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url }, 'incoming request');
    next();
  });

  // ─── Health Check ───────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── DB Diagnostic (temporary) ─────────────────────
  app.get('/api/debug/db', async (_req, res) => {
    try {
      const { prisma } = await import('../shared/db/prisma.js');
      const userCount = await prisma.user.count();
      res.json({ status: 'ok', userCount, env: {
        NODE_ENV: process.env.NODE_ENV,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDbUrl: !!process.env.DATABASE_URL,
        dbUrlPreview: process.env.DATABASE_URL?.substring(0, 40) + '...',
      }});
    } catch (err: any) {
      res.status(500).json({
        error: err.message,
        code: err.code,
        stack: err.stack?.split('\n').slice(0, 5),
      });
    }
  });

  // ─── API Routes ─────────────────────────────────────
  registerRoutes(app);

  // ─── Error Handling ─────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
