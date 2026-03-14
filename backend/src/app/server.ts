import http from 'node:http';
import { createApp } from './app.js';
import { env } from '../shared/config/env.js';
import { connectDatabase } from '../shared/db/prisma.js';
import { logger } from '../shared/logger/logger.js';

async function main() {
  // Connect to database
  await connectDatabase();
  logger.info('✅ Database connected');

  // Create Express app and HTTP server
  const app = createApp();
  const server = http.createServer(app);

  // Start server
  server.listen(env.PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    logger.info(`📋 Health check: http://localhost:${env.PORT}/api/health`);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
