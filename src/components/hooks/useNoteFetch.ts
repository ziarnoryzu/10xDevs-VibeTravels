import { useState, useEffect, useCallback } from "react";
import type { NoteWithPlanViewModel, NoteDTO, TravelPlanDTO } from "@/types";
import { buildNoteViewModel } from "@/lib/utils/note.utils";

interface UseNoteFetchReturn {
  note: NoteWithPlanViewModel | null;
  isLoading: boolean;
  error: string | null;
  refetchPlan: () => Promise<void>;
  setNote: React.Dispatch<React.SetStateAction<NoteWithPlanViewModel | null>>;
}

/**
 * Custom hook for fetching note and travel plan data.
 * Handles initial data loading and plan refetching.
 */
export function useNoteFetch(noteId: string): UseNoteFetchReturn {
  const [note, setNote] = useState<NoteWithPlanViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch note and travel plan data
   */
  const fetchNoteData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Track start time to ensure minimum loading state display
    const startTime = Date.now();

    try {
      // Fetch note
      const noteResponse = await fetch(`/api/notes/${noteId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!noteResponse.ok) {
        if (noteResponse.status === 404) {
          throw new Error("Note not found");
        }
        throw new Error("Failed to fetch note");
      }

      const noteData: NoteDTO = await noteResponse.json();

      // Fetch travel plan only if it exists
      let travelPlan: TravelPlanDTO | null = null;
      if (noteData.has_travel_plan) {
        try {
          const planResponse = await fetch(`/api/notes/${noteId}/travel-plan`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (planResponse.ok) {
            travelPlan = await planResponse.json();
          }
        } catch {
          // Silently ignore plan fetch errors - plan is optional
        }
      }

      // Build view model
      const viewModel = buildNoteViewModel(noteData, travelPlan);

      // Ensure minimum loading time (300ms) for smooth UX with View Transitions
      const elapsed = Date.now() - startTime;
      const minLoadingTime = 300;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsed));
      }

      setNote(viewModel);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  /**
   * Refetch only the travel plan (after generation)
   */
  const refetchPlan = useCallback(async () => {
    if (!note) return;

    // Always try to fetch plan when refetching (assumes plan was just generated)
    let travelPlan: TravelPlanDTO | null = null;
    try {
      const planResponse = await fetch(`/api/notes/${noteId}/travel-plan`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (planResponse.ok) {
        travelPlan = await planResponse.json();
      }
    } catch {
      // Silently ignore errors
    }

    setNote((prev) => {
      if (!prev) return null;
      // Convert plan to TypedTravelPlan format
      const typedPlan = travelPlan
        ? {
            ...travelPlan,
            content: travelPlan.content as unknown as import("@/types").TravelPlanContent,
          }
        : null;
      return {
        ...prev,
        travelPlan: typedPlan,
      };
    });
  }, [noteId, note]);

  // Fetch on mount
  useEffect(() => {
    fetchNoteData();
  }, [fetchNoteData]);

  return {
    note,
    isLoading,
    error,
    refetchPlan,
    setNote,
  };
}
