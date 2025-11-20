import { useEffect } from "react";
import { useNoteDetail } from "@/components/hooks/useNoteDetail";
import { useModalState } from "@/components/hooks/useModalState";
import { GeneratePlanModal } from "@/components/travel-plan/GeneratePlanModal";
import { NoteEditor } from "@/components/note-detail/NoteEditor";
import { NoteActions } from "@/components/note-detail/NoteActions";
import { TravelPlanView } from "@/components/note-detail/TravelPlanView";
import { NoteDetailHeader, DeleteNoteDialog, NoteDetailLoadingState, NoteDetailErrorState } from "./components";
import { toast } from "sonner";
import { navigate, reload, Routes, getReturnUrl, getQueryParam } from "@/lib/services/navigation.service";
import type { NoteEditorViewModel, UpdateNoteDTO } from "@/types";

interface NoteDetailViewProps {
  noteId: string;
}

export default function NoteDetailView({ noteId }: NoteDetailViewProps) {
  // Use the new unified hook
  const {
    note,
    isLoading,
    error,
    autosaveStatus,
    isDeleting,
    isCopying,
    isDeleteDialogOpen,
    updateNote,
    deleteNote,
    copyNote,
    setIsDeleteDialogOpen,
    refetchPlan,
  } = useNoteDetail(noteId);

  // Manage modal states
  const { modals, openModal, closeModal } = useModalState();

  // Get return URL using navigation service
  const returnUrl = getReturnUrl();

  // Handle note not found or error
  useEffect(() => {
    if (error === "Note not found") {
      toast.error("Nie znaleziono notatki");
      navigate(returnUrl, { delay: 2000 });
    } else if (error && autosaveStatus !== "error") {
      // Show toast for errors other than autosave errors (which are shown inline)
      toast.error(error);
    }
  }, [error, autosaveStatus, returnUrl]);

  // Show loading state
  if (isLoading) {
    return <NoteDetailLoadingState />;
  }

  // Show error state with retry option
  if (error && !note) {
    return <NoteDetailErrorState error={error} onRetry={() => reload()} onBack={() => navigate(returnUrl)} />;
  }

  if (!note) {
    return null;
  }

  // Handle note field changes
  const handleNoteChange = (field: "title" | "content", value: string) => {
    const updates: UpdateNoteDTO = { [field]: value };
    updateNote(updates);
  };

  // Handle copy
  const handleCopy = async () => {
    const newNoteId = await copyNote();

    if (newNoteId) {
      toast.success("Notatka została skopiowana");

      // Preserve returnPage parameter when navigating to the copied note
      const returnPage = getQueryParam("returnPage");
      const newNoteUrl = Routes.notes.detail(newNoteId, returnPage ? parseInt(returnPage, 10) : undefined);

      await navigate(newNoteUrl, { delay: 1000 });
    } else {
      toast.error("Nie udało się skopiować notatki");
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    const success = await deleteNote();

    if (success) {
      toast.success("Notatka została usunięta");
      setIsDeleteDialogOpen(false);
      await navigate(returnUrl, { delay: 1000 });
    } else {
      toast.error("Nie udało się usunąć notatki");
    }
  };

  // Handle successful plan generation
  const handlePlanGenerationSuccess = () => {
    // Refetch plan
    refetchPlan();
    toast.success("Plan podróży został zapisany");
  };

  // Build NoteEditorViewModel
  const editorViewModel: NoteEditorViewModel = {
    title: note.title,
    content: note.content,
    status: autosaveStatus,
    lastSavedTimestamp: note.updatedAt,
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 md:px-6 pb-32 md:pb-6 pt-4 md:pt-6">
      <div className="space-y-6">
        {/* Header with back button and metadata */}
        <NoteDetailHeader
          createdAt={note.createdAt}
          updatedAt={note.updatedAt}
          onBackClick={() => navigate(returnUrl)}
        />

        {/* Note Editor */}
        <NoteEditor note={editorViewModel} wordCount={note.wordCount} onNoteChange={handleNoteChange} />

        {/* Action Buttons - desktop only */}
        <div className="hidden md:block">
          <NoteActions
            isReadyForPlanGeneration={note.isReadyForPlanGeneration}
            hasTravelPlan={note.travelPlan !== null}
            isCopying={isCopying}
            onGenerateClick={() => openModal("generatePlan")}
            onCopyClick={handleCopy}
            onDeleteClick={() => setIsDeleteDialogOpen(true)}
          />
        </div>

        {/* Travel Plan View (if exists) */}
        {note.travelPlan && (
          <div className="mt-8">
            <TravelPlanView plan={note.travelPlan} />
          </div>
        )}
      </div>

      {/* Action Buttons - mobile sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white border-t p-4 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto max-w-4xl">
          <NoteActions
            isReadyForPlanGeneration={note.isReadyForPlanGeneration}
            hasTravelPlan={note.travelPlan !== null}
            isCopying={isCopying}
            onGenerateClick={() => openModal("generatePlan")}
            onCopyClick={handleCopy}
            onDeleteClick={() => setIsDeleteDialogOpen(true)}
          />
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteNoteDialog
        open={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />

      {/* Generate plan modal */}
      {note && (
        <GeneratePlanModal
          noteId={noteId}
          existingPlan={note.travelPlan}
          isOpen={modals.generatePlan}
          onOpenChange={(open) => (open ? openModal("generatePlan") : closeModal("generatePlan"))}
          onSuccess={handlePlanGenerationSuccess}
        />
      )}
    </div>
  );
}
