import dotenv from 'dotenv';
import { z } from 'zod/v4';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  API_BASE_URL: z.string().default('http://localhost:4000'),
  // Publicly reachable URL for deployed/tunneled backend — used for media publicUrl in all non-localhost clients
  // Set this to your Railway/Render/ngrok/etc URL. If set, it overrides API_DEVICE_URL for media URL generation.
  API_PUBLIC_URL: z.string().transform(v => v || undefined).optional(),
  // LAN-reachable URL for same-network Expo Go dev (e.g. http://192.168.x.x:4000)
  API_DEVICE_URL: z.string().transform(v => v || undefined).optional(),

  // SMTP / Mail
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default('youssef.elshimyy@gmail.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.issues, null, 2));
  process.exit(1);
}

export const env = parsed.data;

export type Env = typeof env;
