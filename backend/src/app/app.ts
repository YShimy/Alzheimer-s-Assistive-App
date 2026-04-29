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
      res.status(500).json({ error: err.message, code: err.code });
    }
  });

  // ─── Signin Diagnostic (temporary) ─────────────────
  app.post('/api/debug/signin', async (req, res) => {
    const steps: string[] = [];
    try {
      steps.push('1. importing prisma');
      const { prisma } = await import('../shared/db/prisma.js');
      steps.push('2. calling findUnique');
      const user = await prisma.user.findUnique({ where: { email: req.body.email ?? 'test@test.com' } });
      steps.push(`3. result: ${user ? 'user found' : 'null'}`);
      res.json({ ok: true, steps });
    } catch (err: any) {
      res.status(500).json({ failedAt: steps, error: err.message, code: err.code, stack: err.stack?.split('\n').slice(0, 8) });
    }
  });

  // ─── API Routes ─────────────────────────────────────
  registerRoutes(app);

  // ─── Error Handling ─────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
