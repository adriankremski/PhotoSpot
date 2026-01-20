/// <reference types="astro/client" />

import type { SupabaseClient, Session, User } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      supabaseAdmin: SupabaseClient<Database>;
      session: Session | null;
      user: User | null;
    }
  }
}

interface ImportMetaEnv {
  // Public env vars (available on client and server)
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
  readonly PUBLIC_MAPBOX_TOKEN: string;

  // Server-only env vars
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
