import { useState, useEffect, useCallback } from "react";
import type { NoteListItemDTO, NoteListItemViewModel, PaginationViewModel, NotesListApiResponse } from "../../types";

interface UseNotesListReturn {
  notes: NoteListItemViewModel[];
  isLoading: boolean;
  isCreating: boolean;
  pagination: PaginationViewModel | null;
  error: string | null;
  createNote: () => Promise<string>;
  refetch: () => Promise<void>;
}

/**
 * Transform NoteListItemDTO to NoteListItemViewModel
 * Formats date and adds computed properties
 */
function transformNoteToViewModel(note: NoteListItemDTO): NoteListItemViewModel {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Dzisiaj";
    } else if (diffInDays === 1) {
      return "Wczoraj";
    } else if (diffInDays < 7) {
      return `${diffInDays} dni temu`;
    } else {
      return date.toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  return {
    id: note.id,
    title: note.title,
    lastModified: formatDate(note.updated_at),
    hasTravelPlan: note.has_travel_plan,
    href: `/app/notes/${note.id}`, // Will be updated with returnPage in the view
  };
}

/**
 * Custom hook for managing notes list
 * Handles fetching notes, creating new notes, and pagination
 * Transforms DTOs to ViewModels for component consumption
 */
export function useNotesList(page = 1): UseNotesListReturn {
  const [notes, setNotes] = useState<NoteListItemViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [pagination, setPagination] = useState<PaginationViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch notes list
  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Track start time to ensure minimum loading state display
    const startTime = Date.now();

    try {
      const response = await fetch(`/api/notes?page=${page}&limit=20`);

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const data: NotesListApiResponse = await response.json();

      // Transform DTOs to ViewModels
      const viewModels = data.notes.map(transformNoteToViewModel);

      // Ensure minimum loading time (300ms) for smooth UX with View Transitions
      const elapsed = Date.now() - startTime;
      const minLoadingTime = 300;
      if (elapsed < minLoadingTime) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsed));
      }

      setNotes(viewModels);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  // Create new note
  const createNote = useCallback(async (): Promise<string> => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Bez tytułu",
          content: "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      const newNote = await response.json();

      return newNote.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create note";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Refetch notes
  const refetch = useCallback(async () => {
    await fetchNotes();
  }, [fetchNotes]);

  // Fetch notes on mount and when page changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    isLoading,
    isCreating,
    pagination,
    error,
    createNote,
    refetch,
  };
}
