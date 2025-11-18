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
      },
    });

    // Step 4: Handle registration error
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Registration error details:", {
        message: error.message,
        status: error.status,
        name: error.name,
        fullError: error,
      });

      // Check if email already exists
      if (error.message && error.message.includes("already registered")) {
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

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: `Błąd rejestracji: ${error.message || JSON.stringify(error)}`,
          details: error,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Create profile for the new user
    // Note: We create the profile manually because the trigger on auth.users is disabled in local dev
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        name: name,
        preferences: {},
      });

      if (profileError) {
        // eslint-disable-next-line no-console
        console.error("Error creating profile:", profileError);
        // Profile creation failed, but user was created - they can still login
        // The profile will be attempted to be created by trigger or can be fixed later
      }
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
