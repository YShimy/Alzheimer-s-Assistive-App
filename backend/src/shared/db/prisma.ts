import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  // Supabase session pooler uses a certificate chain that Node.js may not trust
  // on serverless platforms. Connection is still encrypted — we just skip CA verification.
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool as any);

export const prisma = new PrismaClient({ adapter } as any);

export async function connectDatabase(): Promise<void> {
  // Verify the pool can connect
  const client = await pool.connect();
  client.release();
  logger.info('Database pool connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  logger.info('Database pool closed');
}
