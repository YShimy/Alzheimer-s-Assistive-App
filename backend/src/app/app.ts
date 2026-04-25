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
  app.use('/uploads', express.static('uploads'));

  // ─── Request Logging ────────────────────────────────
  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url }, 'incoming request');
    next();
  });

  // ─── Health Check ───────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── API Routes ─────────────────────────────────────
  registerRoutes(app);

  // ─── Error Handling ─────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
