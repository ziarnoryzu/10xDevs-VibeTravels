// src/pages/api/auth/login.ts

import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import type { LoginResponseDTO } from "../../../types/auth.types";

export const prerender = false;

// Zod schema for login request
const LoginSchema = z.object({
  email: z.string().email("Nieprawidłowy format adresu email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email and password.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Step 1: Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Nieprawidłowe dane żądania",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Validate request body with Zod
    const validationResult = LoginSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: validationResult.error.errors[0].message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, password } = validationResult.data;

    // Step 3: Create Supabase client and attempt sign in
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Step 4: Handle authentication error
    if (error) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Nieprawidłowy email lub hasło",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Check if user needs onboarding by fetching profile
    const { data: profile } = await supabase.from("profiles").select("preferences").eq("id", data.user.id).single();

    // User needs onboarding if preferences is empty (either {} object or [] array)
    let needsOnboarding = true;
    if (profile?.preferences) {
      const prefs = profile.preferences;
      if (Array.isArray(prefs)) {
        needsOnboarding = prefs.length === 0;
      } else if (typeof prefs === "object") {
        needsOnboarding = Object.keys(prefs).length === 0;
      }
    }

    // Step 6: Return success response with onboarding flag
    const response: LoginResponseDTO = {
      user: {
        id: data.user.id,
        email: data.user.email || "",
      },
      needsOnboarding,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/auth/login:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
