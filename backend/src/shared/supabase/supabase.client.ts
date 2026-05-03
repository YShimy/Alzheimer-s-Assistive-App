import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? 'cognitive-media';

/**
 * Server-side Supabase admin client — lazily initialized.
 * Uses the service role key — NEVER expose this to the frontend.
 * Used exclusively for Supabase Storage operations (upload, delete, get public URL).
 * PostgreSQL access continues to go through Prisma.
 *
 * Lazy initialization prevents FUNCTION_INVOCATION_FAILED cold-start crashes
 * if env vars are missing — errors are thrown at call time instead.
 */
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _supabaseAdmin;
}
