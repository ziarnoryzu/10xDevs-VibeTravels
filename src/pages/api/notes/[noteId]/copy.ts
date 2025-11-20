// src/pages/api/notes/[noteId]/copy.ts

import type { APIRoute } from "astro";
import { z } from "zod";
import type { NoteDTO } from "../../../../types";
import type { SupabaseClient } from "../../../../db/supabase.client";

export const prerender = false;

// UUID validation schema
const UUIDSchema = z.string().uuid();

/**
 * POST /api/notes/{noteId}/copy
 *
 * Creates a duplicate of the note allowing for variant plan creation.
 * The new note will have a new ID and no linked travel plan.
 */
export const POST: APIRoute = async ({ params, locals }) => {
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

    // Step 2: Retrieve original note from database
    const { data: originalNote, error: noteError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .eq("user_id", userId)
      .single();

    // Step 3: Handle not found case
    if (noteError || !originalNote) {
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

    // Step 4: Create a copy of the note (new ID, same title and content, no travel plan)
    const { data: copiedNote, error: copyError } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        title: `${originalNote.title} (Copy)`,
        content: originalNote.content,
      })
      .select()
      .single();

    if (copyError) {
      // eslint-disable-next-line no-console
      console.error("Error copying note:", copyError);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to copy note",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Prepare response
    const response: NoteDTO = {
      id: copiedNote.id,
      user_id: copiedNote.user_id,
      title: copiedNote.title,
      content: copiedNote.content,
      created_at: copiedNote.created_at,
      updated_at: copiedNote.updated_at,
      has_travel_plan: false,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in POST /api/notes/{noteId}/copy:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred while copying the note",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
