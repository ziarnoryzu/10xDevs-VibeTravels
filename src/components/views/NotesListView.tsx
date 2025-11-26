import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNotesList } from "../hooks/useNotesList";
import { Button } from "../ui/button";
import { NotesList } from "../NotesList";
import { EmptyState } from "../EmptyState";
import { OnboardingBanner } from "../OnboardingBanner";
import { NotesListSkeleton } from "../NotesListSkeleton";
import { Pagination } from "../Pagination";
import { navigate, reload, Routes } from "@/lib/services/navigation.service";

/**
 * NotesListView - Main component for displaying the notes list dashboard
 * Manages loading states, empty states, and user interactions
 * Syncs current page with URL search params for better UX
 */
export function NotesListView() {
  // Initialize page state from URL immediately (synchronously)
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window === "undefined") return 1;
    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get("page") || "1", 10);
    return page > 0 ? page : 1;
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const lastRequestedPageRef = useRef<string | null>(null);
  const wasLoadingRef = useRef(false);

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const { notes, isLoading, isCreating, pagination, error, createNote } = useNotesList(currentPage);

  // Sync URL with current page
  useEffect(() => {
    if (typeof window === "undefined" || !isInitialized) return;

    const params = new URLSearchParams(window.location.search);
    const urlPage = parseInt(params.get("page") || "1", 10);

    if (urlPage !== currentPage) {
      // Update URL without page reload
      const newUrl = currentPage === 1 ? window.location.pathname : `${window.location.pathname}?page=${currentPage}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [currentPage, isInitialized]);

  // Handle creating a new note - memoized to prevent re-creation on every render
  const handleCreateNote = useCallback(async () => {
    try {
      const newNoteId = await createNote();

      const targetUrl = Routes.notes.detail(newNoteId, currentPage);
      navigate(targetUrl);
    } catch {
      // Error is already handled in the hook and displayed via error state
      toast.error("Nie udało się utworzyć notatki. Spróbuj ponownie.");
    }
  }, [createNote, currentPage]);

  // Handle page change - memoized to prevent re-creation on every render
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top when changing pages for better UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Show toast notification when there's an error
  useEffect(() => {
    if (error && !isLoading) {
      toast.error("Nie udało się załadować notatek. Spróbuj odświeżyć stronę.");
    }
  }, [error, isLoading]);

  // Sync currentPage and URL when backend corrects an invalid page number
  // This happens after deleting the last note on a page
  useEffect(() => {
    if (!pagination || typeof window === "undefined" || !isInitialized) {
      // Still update the ref even if we return early
      wasLoadingRef.current = isLoading;
      return;
    }

    // Capture previous loading state BEFORE updating
    const wasLoading = wasLoadingRef.current;

    // Update ref for next render
    wasLoadingRef.current = isLoading;

    // Only process corrections when data JUST finished loading
    // (was loading before, not loading anymore)
    if (isLoading || !wasLoading) {
      return;
    }

    // Backend returned different page than we requested
    // Always trust the backend and sync our state
    if (currentPage !== pagination.page) {
      // Check if we already processed this correction to avoid infinite loop
      const correctionKey = `${currentPage}->${pagination.page}`;

      if (lastRequestedPageRef.current === correctionKey) {
        return;
      }

      // Mark this correction as processed BEFORE calling setState
      lastRequestedPageRef.current = correctionKey;

      // Update currentPage to match what backend returned
      // This will trigger a new fetch, but ref will prevent re-processing
      setCurrentPage(pagination.page);

      // Update URL to match the corrected page
      const newUrl =
        pagination.page === 1 ? window.location.pathname : `${window.location.pathname}?page=${pagination.page}`;
      window.history.replaceState({}, "", newUrl);
    } else {
      // Normal case: page matches, reset correction tracking
      lastRequestedPageRef.current = null;
    }
  }, [isLoading, pagination, currentPage, isInitialized]);

  // Loading state - show skeletons
  if (isLoading) {
    return <NotesListSkeleton count={5} />;
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Moje notatki</h1>
          <Button
            onClick={handleCreateNote}
            disabled={isCreating}
            className="w-full sm:w-auto"
            data-test-id="create-note-button"
          >
            {isCreating ? "Tworzenie..." : "Nowa notatka"}
          </Button>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-800">{error}</p>
          <Button onClick={() => reload()} variant="outline" className="mt-4 w-full sm:w-auto">
            Odśwież stronę
          </Button>
        </div>
      </div>
    );
  }

  // Empty state - no notes yet
  if (notes.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Moje notatki</h1>
          <Button
            onClick={handleCreateNote}
            disabled={isCreating}
            className="w-full sm:w-auto"
            data-test-id="create-note-button"
          >
            {isCreating ? "Tworzenie..." : "Nowa notatka"}
          </Button>
        </div>
        <EmptyState onCreateNote={handleCreateNote} isCreating={isCreating} />
      </div>
    );
  }

  // List view with notes
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header with title and create button */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-2xl font-bold sm:text-3xl">Moje notatki</h1>
        <Button
          onClick={handleCreateNote}
          disabled={isCreating}
          className="w-full sm:w-auto"
          data-test-id="create-note-button"
        >
          {isCreating ? "Tworzenie..." : "Nowa notatka"}
        </Button>
      </div>

      {/* Onboarding banner for new users */}
      {pagination && pagination.total < 2 && <OnboardingBanner />}

      {/* Notes list */}
      <NotesList notes={notes} currentPage={currentPage} />

      {/* Pagination */}
      {pagination && <Pagination pagination={pagination} onPageChange={handlePageChange} />}
    </div>
  );
}
