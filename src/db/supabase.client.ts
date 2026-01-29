import { createClient, type SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

// Client-side Supabase client - uses PUBLIC_ prefixed env vars
// These are safe to expose to the browser (anon key only)
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required Supabase environment variables. Please ensure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_KEY are set."
  );
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Creates an admin Supabase client with service role key.
 * IMPORTANT: This should ONLY be called on the server-side.
 * The service role key must be provided at runtime from environment variables.
 * 
 * @param serviceRoleKey - The Supabase service role key from environment variables
 * @returns Supabase admin client with elevated permissions
 */
export function createSupabaseAdmin(serviceRoleKey: string): SupabaseClientType<Database> {
  if (!serviceRoleKey) {
    throw new Error("Service role key is required to create admin client");
  }
  
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Export type for use in service layers
export type SupabaseClient = SupabaseClientType<Database>;
