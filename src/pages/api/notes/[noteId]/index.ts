// src/pages/api/notes/[noteId]/index.ts

import type { APIRoute } from "astro";
import { z } from "zod";
import type { NoteDTO } from "../../../../types";
import type { SupabaseClient } from "../../../../db/supabase.client";

export const prerender = false;

// UUID validation schema
const UUIDSchema = z.string().uuid();

// Zod schema for update request body
const UpdateNoteSchema = z
  .object({
    title: z.string().min(1, "Title cannot be empty").optional(),
    content: z.string().nullable().optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "At least one field (title or content) must be provided",
  });

/**
 * GET /api/notes/{noteId}
 *
 * Retrieves the full detail of a specific note.
 * Validates note ownership and returns 404 if not found.
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

    // Step 2: Retrieve note from database
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    // Step 3: Handle not found case
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

    // Step 4: Check if travel plan exists
    const { data: travelPlan } = await supabase.from("travel_plans").select("id").eq("note_id", noteId).single();

    // Step 5: Prepare response
    const response: NoteDTO = {
      id: note.id,
      user_id: note.user_id,
      title: note.title,
      content: note.content,
      created_at: note.created_at,
      updated_at: note.updated_at,
      has_travel_plan: !!travelPlan,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in GET /api/notes/{noteId}:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while retrieving the note",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * PUT /api/notes/{noteId}
 *
 * Updates the note's title and/or content.
 * At least one field must be provided.
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
    const validationResult = UpdateNoteSchema.safeParse(body);
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

    const updateData = validationResult.data;

    // Step 4: Check if note exists and user has access
    const { data: existingNote } = await supabase
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    if (!existingNote) {
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

    // Step 5: Update note in database
    const { data: updatedNote, error: updateError } = await supabase
      .from("notes")
      .update(updateData)
      .eq("id", noteId)
      .select()
      .single();

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error("Error updating note:", updateError);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to update note",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 6: Check if travel plan exists
    const { data: travelPlan } = await supabase.from("travel_plans").select("id").eq("note_id", noteId).single();

    // Step 7: Prepare response
    const response: NoteDTO = {
      id: updatedNote.id,
      user_id: updatedNote.user_id,
      title: updatedNote.title,
      content: updatedNote.content,
      created_at: updatedNote.created_at,
      updated_at: updatedNote.updated_at,
      has_travel_plan: !!travelPlan,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in PUT /api/notes/{noteId}:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while updating the note",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * DELETE /api/notes/{noteId}
 *
 * Deletes the note. Related travel plan (if exists) is also cascaded.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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
    const { data: existingNote } = await supabase
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    if (!existingNote) {
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

    // Step 3: Delete note from database (cascade will delete travel_plan)
    const { error: deleteError } = await supabase.from("notes").delete().eq("id", noteId);

    if (deleteError) {
      // eslint-disable-next-line no-console
      console.error("Error deleting note:", deleteError);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to delete note",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Return 204 No Content (successful deletion)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in DELETE /api/notes/{noteId}:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while deleting the note",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
