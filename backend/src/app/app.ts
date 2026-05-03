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

  // ─── Minimal POST test (temporary) ──────────────────
  app.post('/api/debug/echo', (req, res) => {
    res.json({ received: req.body });
  });
  
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
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'cognitive-support-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'cognitive-support-backend',
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

  // ─── Raw Auth Diagnostic (temporary) ────────────────
  // Bypasses all middleware — exposes raw errors for debugging only
  app.post('/api/debug/auth-raw', async (req, res) => {
    const log: string[] = [];
    try {
      log.push('start');
      const { authService } = await import('../modules/auth/service/auth.service.js');
      log.push('authService imported');
      const result = await authService.signin(req.body.email, req.body.password);
      log.push('signin succeeded');
      res.json({ ok: true, log, hasAccessToken: !!result.accessToken });
    } catch (err: any) {
      res.status(200).json({ ok: false, log, error: err.message, code: err.code, name: err.name, stack: err.stack?.split('\n').slice(0, 10) });
    }
  });

  // ─── API Routes ─────────────────────────────────────
  registerRoutes(app);

  // ─── Error Handling ─────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
