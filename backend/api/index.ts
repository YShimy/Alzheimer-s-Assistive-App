/**
 * api/index.ts — Vercel Serverless Entry Point
 *
 * Vercel does not run a persistent HTTP server.
 * It invokes this module as a serverless function per request.
 * We export the Express app directly — no server.listen() here.
 *
 * DB connection is initialised once at module load (cold start),
 * then reused across warm invocations in the same function instance.
 */

import 'dotenv/config';
import { createApp } from '../src/app/app.js';
import { connectDatabase } from '../src/shared/db/prisma.js';
import { logger } from '../src/shared/logger/logger.js';

// Connect once on cold start — reused across warm invocations
let isConnected = false;

async function ensureConnected() {
  if (!isConnected) {
    await connectDatabase();
    logger.info('✅ Database connected (serverless cold start)');
    isConnected = true;
  }
}

const app = createApp();

// Wrap the app to ensure DB is ready before handling requests
const handler = async (req: any, res: any) => {
  await ensureConnected();
  return app(req, res);
};

export default handler;
