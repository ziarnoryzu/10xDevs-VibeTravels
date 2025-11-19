// src/middleware/index.ts

import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

// Get base path from import.meta.env.BASE_URL (set in astro.config.mjs)
// This will be "/" for local dev and "/10x-project" for GitHub Pages deployment
const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, ""); // Remove trailing slash

// Public paths - Auth API endpoints & Server-Rendered Astro Pages
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  "/auth/forgot-password",
  // Auth API endpoints (public - no authentication required)
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/reset-password",
  "/api/auth/forgot-password",
  "/api/auth/password", // Password reset with token
  // Public pages
  "/",
];

// API paths that require authentication
const PROTECTED_API_PREFIX = "/api/";
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/reset-password",
  "/api/auth/forgot-password",
  "/api/auth/password",
];

function isProtectedApiPath(pathname: string): boolean {
  // Check if it's an API path
  if (!pathname.startsWith(PROTECTED_API_PREFIX)) {
    return false;
  }

  // Check if it's a public API path
  return !PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { locals, cookies, url, request, redirect } = context;

  // Create Supabase client for all requests
  // Pass runtime for Cloudflare Pages environment variables
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
    runtime: (locals as { runtime?: { env: Record<string, string | undefined> } }).runtime,
  });

  // Always set supabase client in locals (TypeScript workaround)
  (locals as { supabase: typeof supabase }).supabase = supabase;

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Set user in locals if authenticated
  if (user) {
    (locals as { user?: { id: string; email: string } }).user = {
      email: user.email || "",
      id: user.id,
    };
  }

  // Normalize pathname - remove base path if exists
  // This ensures route matching works correctly whether deployed at root or subdirectory
  const pathname = BASE_PATH ? url.pathname.replace(new RegExp(`^${BASE_PATH}`), "") : url.pathname;

  // Handle API endpoints - return 401 JSON response for protected API routes
  if (isProtectedApiPath(pathname) && !user) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Redirect to login for protected routes if not authenticated
  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return redirect(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
  }

  return next();
});
