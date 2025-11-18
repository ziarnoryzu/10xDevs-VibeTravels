// src/pages/api/profiles/me.ts

import type { APIRoute } from "astro";
import { z } from "zod";
import type { UserProfileDTO } from "../../../types";
import type { SupabaseClient } from "../../../db/supabase.client";
import { createSupabaseAdminClient } from "../../../db/supabase.client";
import type { Json } from "../../../db/database.types";

export const prerender = false;

// Zod schema for update request body
const UpdateProfileSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters long").optional(),
    preferences: z.array(z.string()).optional(),
  })
  .refine((data) => data.name !== undefined || data.preferences !== undefined, {
    message: "At least one field (name or preferences) must be provided",
  });

/**
 * GET /api/profiles/me
 *
 * Retrieves the authenticated user's profile.
 */
export const GET: APIRoute = async ({ locals }) => {
  // User is guaranteed to exist by middleware
  const userId = (locals.user as { id: string; email: string }).id;
  const userEmail = (locals.user as { id: string; email: string }).email;

  // Type assertion for Supabase client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (locals as any).supabase as SupabaseClient;

  try {
    // Step 1: Retrieve profile from database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Step 2: Handle not found case
    // 410 Gone indicates the profile existed but was deleted (zombie account state)
    // This happens when a user exists in auth.users but not in profiles table
    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          error: "Gone",
          message:
            "Profile no longer exists. Your account may have been deleted. Please contact support if this is unexpected.",
        }),
        {
          status: 410,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Parse preferences from Json to string[]
    let preferences: string[] = [];
    if (profile.preferences && typeof profile.preferences === "object" && !Array.isArray(profile.preferences)) {
      // If preferences is an object (Record<string, string[]>), flatten all values
      preferences = Object.values(profile.preferences as Record<string, unknown>)
        .flat()
        .filter((item): item is string => typeof item === "string");
    } else if (Array.isArray(profile.preferences)) {
      // If preferences is already an array, use it directly
      preferences = profile.preferences.filter((item): item is string => typeof item === "string");
    }

    // Step 4: Prepare response
    const response: UserProfileDTO = {
      id: profile.id,
      email: userEmail || "",
      name: profile.name,
      preferences,
      created_at: profile.created_at,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/profiles/me:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while retrieving the profile",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * PUT /api/profiles/me
 *
 * Updates the authenticated user's profile data.
 * Name is required, preferences are optional.
 */
export const PUT: APIRoute = async ({ request, locals }) => {
  // User is guaranteed to exist by middleware
  const userId = (locals.user as { id: string; email: string }).id;
  const userEmail = (locals.user as { id: string; email: string }).email;

  // Type assertion for Supabase client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (locals as any).supabase as SupabaseClient;

  try {
    // Step 1: Parse and validate request body
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

    // Step 2: Validate request body with Zod
    const validationResult = UpdateProfileSchema.safeParse(body);
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

    const { name, preferences } = validationResult.data;

    // Step 3: Prepare update data
    const updateData: { name?: string; preferences?: Json } = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (preferences !== undefined) {
      // Convert string[] to Json for database storage
      updateData.preferences = preferences as Json;
    }

    // Step 4: Update profile in database
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (updateError || !updatedProfile) {
      // Check if profile doesn't exist (zombie account state)
      if (updateError?.code === "PGRST116") {
        return new Response(
          JSON.stringify({
            error: "Gone",
            message:
              "Profile no longer exists. Your account may have been deleted. Please contact support if this is unexpected.",
          }),
          {
            status: 410,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // eslint-disable-next-line no-console
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to update profile",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Parse preferences from Json to string[]
    let updatedPreferences: string[] = [];
    if (
      updatedProfile.preferences &&
      typeof updatedProfile.preferences === "object" &&
      !Array.isArray(updatedProfile.preferences)
    ) {
      // If preferences is an object (Record<string, string[]>), flatten all values
      updatedPreferences = Object.values(updatedProfile.preferences as Record<string, unknown>)
        .flat()
        .filter((item): item is string => typeof item === "string");
    } else if (Array.isArray(updatedProfile.preferences)) {
      // If preferences is already an array, use it directly
      updatedPreferences = updatedProfile.preferences.filter((item): item is string => typeof item === "string");
    }

    // Step 6: Prepare response
    const response: UserProfileDTO = {
      id: updatedProfile.id,
      email: userEmail || "",
      name: updatedProfile.name,
      preferences: updatedPreferences,
      created_at: updatedProfile.created_at,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in PUT /api/profiles/me:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating the profile",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/profiles/me
 *
 * Permanently deletes the authenticated user's account and all associated data.
 *
 * Process:
 * 1. Sign out the user to invalidate the session
 * 2. Delete the user from Supabase Auth using admin client
 * 3. Database CASCADE rules automatically delete:
 *    - User's profile (ON DELETE CASCADE from auth.users)
 *    - User's notes (ON DELETE CASCADE from auth.users)
 *    - Travel plans (ON DELETE CASCADE from notes)
 */
export const DELETE: APIRoute = async ({ locals }) => {
  // User is guaranteed to exist by middleware
  const userId = (locals.user as { id: string; email: string }).id;

  // Type assertion for Supabase client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (locals as any).supabase as SupabaseClient;

  try {
    // Step 1: Sign out the user to invalidate the session
    // This ensures the user won't have an active session after deletion
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      // eslint-disable-next-line no-console
      console.error("Error signing out user during deletion:", signOutError);
      // Continue with deletion even if sign out fails
    }

    // Step 2: Delete user from auth.users using admin client
    // We use direct SQL instead of admin.deleteUser() because:
    // - admin.deleteUser() may use "soft delete" instead of physical deletion
    // - Direct SQL ensures immediate deletion and CASCADE triggers
    // This will cascade delete all related data in the database:
    // - profiles (via ON DELETE CASCADE from auth.users)
    // - notes (via ON DELETE CASCADE from auth.users)
    // - travel_plans (via ON DELETE CASCADE from notes)
    const adminClient = createSupabaseAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (adminClient as any).rpc("delete_user_account", {
      user_id: userId,
    });

    if (deleteError) {
      // eslint-disable-next-line no-console
      console.error("Error deleting user account:", deleteError);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to delete user account",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Return success
    return new Response(
      JSON.stringify({
        message: "Account deleted successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in DELETE /api/profiles/me:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting the account",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
