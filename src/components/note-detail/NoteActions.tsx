import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NoteActionsProps {
  isReadyForPlanGeneration: boolean;
  hasTravelPlan: boolean;
  isCopying: boolean;
  onGenerateClick: () => void;
  onCopyClick: () => void;
  onDeleteClick: () => void;
}

/**
 * NoteActions component provides action buttons for note operations.
 * Includes generate/regenerate plan, copy, and delete buttons.
 * Handles button states and tooltips based on note readiness.
 */
export function NoteActions({
  isReadyForPlanGeneration,
  hasTravelPlan,
  isCopying,
  onGenerateClick,
  onCopyClick,
  onDeleteClick,
}: NoteActionsProps) {
  const generateButtonText = hasTravelPlan ? "Regeneruj plan" : "Generuj plan";
  const tooltipText = "Dodaj więcej szczegółów do notatki (min. 10 słów), aby wygenerować plan.";

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Generate Plan Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1">
              <Button
                onClick={onGenerateClick}
                disabled={!isReadyForPlanGeneration}
                className={
                  hasTravelPlan
                    ? "w-full border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    : "w-full"
                }
                variant={hasTravelPlan ? "outline" : "default"}
                aria-label={generateButtonText}
              >
                {hasTravelPlan && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                )}
                {generateButtonText}
              </Button>
            </span>
          </TooltipTrigger>
          {!isReadyForPlanGeneration && (
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Copy Button */}
      <Button
        onClick={onCopyClick}
        disabled={isCopying}
        variant="outline"
        className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/50"
        aria-label="Kopiuj notatkę"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        {isCopying ? "Kopiowanie..." : "Kopiuj"}
      </Button>

      {/* Delete Button */}
      <Button onClick={onDeleteClick} variant="destructive" className="flex-1" aria-label="Usuń notatkę">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Usuń
      </Button>
    </div>
  );
}
