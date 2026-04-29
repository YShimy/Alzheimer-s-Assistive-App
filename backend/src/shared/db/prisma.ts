import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

// Strip sslmode from the connection string so pg-connection-string doesn't
// parse it and override our explicit ssl config. The pg library currently treats
// sslmode=require as verify-full, which rejects Supabase's certificate chain.
const cleanUrl = env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, (match) =>
  match.startsWith('?') ? '?' : ''
).replace(/\?$/, '').replace(/\?&/, '?');

const pool = new pg.Pool({
  connectionString: cleanUrl,
  // Connection is still encrypted — we just skip CA certificate verification
  // which is required for Supabase session pooler on serverless platforms.
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
