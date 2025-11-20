// src/db/supabase.client.ts

import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";
import type { Database } from "./database.types";

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD, // Only require HTTPS in production
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
  runtime?: { env: Record<string, string | undefined> };
}) => {
  // Get environment variables with Cloudflare runtime support
  // Prefer runtime values (Cloudflare Pages) over build-time values
  const supabaseUrl = (context.runtime?.env.SUPABASE_URL || SUPABASE_URL) as string;
  const supabaseAnonKey = (context.runtime?.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY) as string;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[]) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  });

  return supabase;
};

export const createSupabaseAdminClient = (runtimeEnv?: Record<string, string | undefined>) => {
  // Get environment variables with Cloudflare runtime support
  // Prefer runtime values (Cloudflare Pages) over build-time values
  const supabaseUrl = (runtimeEnv?.SUPABASE_URL || SUPABASE_URL) as string;
  const supabaseServiceRoleKey = (runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY) as string;

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetch.bind(globalThis),
    },
  });
};

export type SupabaseClient = ReturnType<typeof createSupabaseServerInstance>;
