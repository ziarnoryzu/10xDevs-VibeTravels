// src/pages/api/notes/[noteId]/generate-plan.ts

import type { APIRoute } from "astro";
import { z } from "zod";
import type { GenerateTravelPlanCommand, TravelPlanDTO } from "../../../../types";
import { travelPlanService } from "../../../../lib/services/travel-plan.service";
import type { SupabaseClient } from "../../../../db/supabase.client";
import {
  OpenRouterError,
  AuthenticationError,
  BadRequestError,
  RateLimitError,
  ServerError,
  InvalidJSONResponseError,
  SchemaValidationError,
} from "../../../../lib/errors";

export const prerender = false;

// Zod schema for request body validation
const GenerateTravelPlanSchema = z.object({
  options: z
    .object({
      style: z.enum(["adventure", "leisure"]).optional(),
      transport: z.enum(["car", "public", "walking"]).optional(),
      budget: z.enum(["economy", "standard", "luxury"]).optional(),
    })
    .optional(),
});

// UUID validation schema
const UUIDSchema = z.string().uuid();

/**
 * POST /api/notes/{noteId}/generate-plan
 *
 * Generates a travel plan from a user's travel note.
 * Validates authentication, note ownership, content requirements,
 * and optional personalization options.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  // User is guaranteed to exist by middleware
  const userId = (locals.user as { id: string; email: string }).id;

  // Type assertion for Supabase client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (locals as any).supabase as SupabaseClient;

  try {
    // Step 2: Validate noteId parameter
    const noteIdValidation = UUIDSchema.safeParse(params.noteId);
    if (!noteIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid note ID format. Must be a valid UUID",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const noteId = noteIdValidation.data;

    // Step 3: Parse and validate request body (optional)
    let command: GenerateTravelPlanCommand = {};

    // Check if request has a body
    const contentType = request.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const body = await request.json();
        const validatedBody = GenerateTravelPlanSchema.parse(body);
        command = validatedBody;
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message:
              error instanceof z.ZodError
                ? `Invalid request body: ${error.errors.map((e) => e.message).join(", ")}`
                : "Invalid request body format",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Step 4: Retrieve note from database
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    if (noteError || !note) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Note not found or you don't have access to it",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Validate note content (minimum 10 words)
    if (!travelPlanService.validateNoteContent(note.content)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Note content must contain at least 10 words to generate a travel plan",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Retrieve user profile with preferences
    const { data: userProfile } = await supabase.from("profiles").select("preferences").eq("id", userId).single();

    // Parse preferences from Json to string[]
    let userPreferences: string[] = [];
    if (userProfile?.preferences) {
      if (typeof userProfile.preferences === "object" && !Array.isArray(userProfile.preferences)) {
        // If preferences is an object (Record<string, string[]>), flatten all values
        userPreferences = Object.values(userProfile.preferences as Record<string, unknown>)
          .flat()
          .filter((item): item is string => typeof item === "string");
      } else if (Array.isArray(userProfile.preferences)) {
        // If preferences is already an array, use it directly
        userPreferences = userProfile.preferences.filter((item): item is string => typeof item === "string");
      }
    }

    // Step 7: Check if a travel plan already exists for this note
    const { data: existingPlan } = await supabase.from("travel_plans").select("id").eq("note_id", noteId).single();

    const isUpdate = !!existingPlan;

    // Step 8: Generate travel plan with user preferences
    // TypeScript guard: we already validated content is not null/empty
    const noteContent = note.content as string;
    // Pass runtime environment for Cloudflare Pages support
    const runtimeEnv = (locals as { runtime?: { env: Record<string, string | undefined> } }).runtime?.env;
    const planContent = await travelPlanService.generatePlan(noteContent, command.options, userPreferences, runtimeEnv);

    // Step 9: Save travel plan to database (upsert to handle unique constraint on note_id)
    const { data: travelPlan, error: planError } = await supabase
      .from("travel_plans")
      .upsert(
        {
          note_id: noteId,
          content: planContent,
        },
        {
          onConflict: "note_id",
        }
      )
      .select()
      .single();

    if (planError) {
      // eslint-disable-next-line no-console
      console.error("Error saving travel plan:", planError);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to save travel plan",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 10: Prepare response
    const response: { travel_plan: TravelPlanDTO } = {
      travel_plan: {
        id: travelPlan.id,
        note_id: travelPlan.note_id,
        content: travelPlan.content,
        created_at: travelPlan.created_at,
        updated_at: travelPlan.updated_at,
      },
    };

    // Determine status code: 201 for new, 200 for updated
    const statusCode = isUpdate ? 200 : 201;

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in generate-plan endpoint:", error);

    // Handle OpenRouter-specific errors
    if (error instanceof AuthenticationError) {
      return new Response(
        JSON.stringify({
          error: "Configuration Error",
          message: "AI service configuration error. Please contact support.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify({
          error: "Rate Limit Exceeded",
          message: "Too many requests. Please try again in a few moments.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60", // Suggest retry after 60 seconds
          },
        }
      );
    }

    if (error instanceof BadRequestError) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: `Invalid request to AI service: ${error.message}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof InvalidJSONResponseError) {
      return new Response(
        JSON.stringify({
          error: "AI Response Error",
          message: "AI service returned an invalid response. Please try again.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof SchemaValidationError) {
      return new Response(
        JSON.stringify({
          error: "AI Response Error",
          message: "AI service returned data in an unexpected format. Please try again.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error instanceof ServerError || error instanceof OpenRouterError) {
      return new Response(
        JSON.stringify({
          error: "Service Unavailable",
          message: "AI service is currently unavailable. Please try again later.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle any other unexpected errors
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while generating the travel plan",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
