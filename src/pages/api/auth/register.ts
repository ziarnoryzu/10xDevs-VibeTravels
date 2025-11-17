// src/pages/api/auth/register.ts

import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

export const prerender = false;

// Zod schema for registration request
const RegisterSchema = z.object({
  name: z.string().min(2, "Imię musi mieć co najmniej 2 znaki"),
  email: z.string().email("Nieprawidłowy format adresu email"),
  password: z
    .string()
    .min(8, "Hasło musi mieć co najmniej 8 znaków")
    .regex(/[A-Z]/, "Hasło musi zawierać co najmniej jedną wielką literę")
    .regex(/[a-z]/, "Hasło musi zawierać co najmniej jedną małą literę")
    .regex(/\d/, "Hasło musi zawierać co najmniej jedną cyfrę"),
});

/**
 * POST /api/auth/register
 *
 * Registers a new user with email, password, and name.
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
    const validationResult = RegisterSchema.safeParse(body);
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

    const { name, email, password } = validationResult.data;

    // Step 3: Create Supabase client and attempt sign up
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: undefined, // Disable email confirmation for MVP
      },
    });

    // Step 4: Handle registration error
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Supabase signUp error:", error);

      // Check if email already exists
      if (error.message.includes("already registered")) {
        return new Response(
          JSON.stringify({
            error: "Conflict",
            message: "Konto z tym adresem email już istnieje",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Return error with details for debugging
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Wystąpił błąd podczas rejestracji. Spróbuj ponownie.",
          debug: import.meta.env.DEV ? error.message : undefined, // Only in dev
          hint: "Sprawdź logi serwera lub ustawienia Supabase Auth",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Verify session was created
    if (!data.session) {
      // If no session, it means email confirmation is required
      // This should not happen in MVP - email confirmation should be disabled in Supabase
      return new Response(
        JSON.stringify({
          error: "Service Configuration Required",
          message:
            "Rejestracja wymaga konfiguracji serwera. Skontaktuj się z administratorem lub sprawdź ustawienia Supabase (Authentication → Email → wyłącz 'Confirm email').",
          details: "Email confirmation is enabled in Supabase. Please disable it for seamless user registration.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Return success response
    return new Response(
      JSON.stringify({
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/auth/register:", error);
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
