import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

// Client-side Supabase client - uses PUBLIC_ prefixed env vars
// These are safe to expose to the browser (anon key only)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

// Service role key for server-side operations (never exposed to client)
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables. Please ensure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY are set.');
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations only
// Falls back to public URL if service role key is not available (e.g., on client)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient<Database>(
      supabaseUrl, 
      supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : supabaseClient; // Fallback to regular client if service role key not available

// Export type for use in service layers
export type SupabaseClient = SupabaseClientType<Database>;

