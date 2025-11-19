// src/pages/api/notes/[noteId]/travel-plan.ts

import type { APIRoute } from "astro";
import { z } from "zod";
import type { TravelPlanDTO } from "../../../../types";
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

// UUID validation schema
const UUIDSchema = z.string().uuid();

// Zod schema for update request body
const UpdateTravelPlanSchema = z.object({
  confirm: z.boolean(),
  options: z
    .object({
      style: z.enum(["adventure", "leisure"]).optional(),
      transport: z.enum(["car", "public", "walking"]).optional(),
      budget: z.enum(["economy", "standard", "luxury"]).optional(),
    })
    .optional(),
});

/**
 * GET /api/notes/{noteId}/travel-plan
 *
 * Retrieves the travel plan linked to the note.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  // User is guaranteed to exist by middleware
  const userId = (locals.user as { id: string; email: string }).id;

  // Type assertion for Supabase client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (locals as any).supabase as SupabaseClient;

  try {
    // Step 1: Validate noteId parameter
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

    // Step 2: Check if note exists and user has access
    const { data: note } = await supabase.from("notes").select("id").eq("id", noteId).eq("user_id", userId).single();

    if (!note) {
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

    // Step 3: Retrieve travel plan from database
    const { data: travelPlan, error: planError } = await supabase
      .from("travel_plans")
      .select("*")
      .eq("note_id", noteId)
      .single();

    // Step 4: Handle not found case
    if (planError || !travelPlan) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Travel plan not found for this note",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Prepare response
    const response: TravelPlanDTO = {
      id: travelPlan.id,
      note_id: travelPlan.note_id,
      content: travelPlan.content,
      created_at: travelPlan.created_at,
      updated_at: travelPlan.updated_at,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/notes/{noteId}/travel-plan:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while retrieving the travel plan",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * HEAD /api/notes/{noteId}/travel-plan
 *
 * Checks if a travel plan exists for the note without returning the content.
 * Returns 200 if exists, 404 if not found.
 */
export const HEAD: APIRoute = async ({ params, locals }) => {
  // User is guaranteed to exist by middleware
  const userId = (locals.user as { id: string; email: string }).id;

  // Type assertion for Supabase client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (locals as any).supabase as SupabaseClient;

  try {
    // Step 1: Validate noteId parameter
    const noteIdValidation = UUIDSchema.safeParse(params.noteId);
    if (!noteIdValidation.success) {
      return new Response(null, { status: 400 });
    }

    const noteId = noteIdValidation.data;

    // Step 2: Check if note exists and user has access
    const { data: note } = await supabase.from("notes").select("id").eq("id", noteId).eq("user_id", userId).single();

    if (!note) {
      return new Response(null, { status: 404 });
    }

    // Step 3: Check if travel plan exists
    const { data: travelPlan } = await supabase.from("travel_plans").select("id").eq("note_id", noteId).single();

    if (!travelPlan) {
      return new Response(null, { status: 404 });
    }

    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 500 });
  }
};

/**
 * PUT /api/notes/{noteId}/travel-plan
 *
 * Allows the user to re-generate or update the travel plan for the note.
 * Requires confirmation to overwrite the previous plan.
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  // User is guaranteed to exist by middleware
  const userId = (locals.user as { id: string; email: string }).id;

  // Type assertion for Supabase client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (locals as any).supabase as SupabaseClient;

  try {
    // Step 1: Validate noteId parameter
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

    // Step 2: Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Validate request body with Zod
    const validationResult = UpdateTravelPlanSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: `Validation failed: ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { confirm, options } = validationResult.data;

    // Step 4: Check confirmation flag
    if (!confirm) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Confirmation required to overwrite existing travel plan. Set 'confirm' to true.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Retrieve note and validate content
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

    // Step 6: Validate note content (minimum 10 words)
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

    // Step 7: Retrieve user profile with preferences
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

    // Step 8: Check if travel plan exists
    const { data: existingPlan } = await supabase.from("travel_plans").select("id").eq("note_id", noteId).single();

    if (!existingPlan) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Travel plan not found for this note. Use POST /api/notes/{noteId}/generate-plan to create one.",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 9: Regenerate travel plan with user preferences
    const noteContent = note.content as string;
    // Pass runtime environment for Cloudflare Pages support
    const runtimeEnv = (locals as { runtime?: { env: Record<string, string | undefined> } }).runtime?.env;
    const planContent = await travelPlanService.generatePlan(noteContent, options, userPreferences, runtimeEnv);

    // Step 10: Update travel plan in database
    const { data: updatedPlan, error: updateError } = await supabase
      .from("travel_plans")
      .update({ content: planContent })
      .eq("note_id", noteId)
      .select()
      .single();

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error("Error updating travel plan:", updateError);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to update travel plan",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 11: Prepare response
    const response: TravelPlanDTO = {
      id: updatedPlan.id,
      note_id: updatedPlan.note_id,
      content: updatedPlan.content,
      created_at: updatedPlan.created_at,
      updated_at: updatedPlan.updated_at,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in PUT /api/notes/{noteId}/travel-plan:", error);

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
        message: "An unexpected error occurred while updating the travel plan",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
