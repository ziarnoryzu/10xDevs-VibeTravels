/// <reference types="astro/client" />
/// <reference types="astro/env" />

import type { SupabaseClient } from "./db/supabase.client";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user:
        | {
            id: string;
            email: string;
          }
        | undefined;
      runtime?: {
        env: {
          SUPABASE_URL?: string;
          SUPABASE_ANON_KEY?: string;
          SUPABASE_SERVICE_ROLE_KEY?: string;
          OPENROUTER_API_KEY?: string;
        };
      };
    }
  }
}

interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL?: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly DEFAULT_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
