import type { TypedTravelPlan } from "@/types";
import { DayCard, PlanDisclaimer } from "./components";
import { Button } from "@/components/ui/button";

export type TravelPlanVariant = "preview" | "saved";

interface TravelPlanDisplayProps {
  plan: TypedTravelPlan;
  variant: TravelPlanVariant;
  onSave?: () => void;
  showGeneratedDate?: boolean;
}

/**
 * TravelPlanDisplay is a unified component for displaying travel plans.
 * Supports two variants:
 * - "preview": Shows a newly generated plan with a save button
 * - "saved": Shows an existing saved plan with optional creation date
 */
export function TravelPlanDisplay({ plan, variant, onSave, showGeneratedDate = false }: TravelPlanDisplayProps) {
  const isPreview = variant === "preview";

  // Preview variant uses flex layout with fixed save button
  if (isPreview) {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-2 space-y-6">
          {/* Success message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-green-900 mb-1">Plan podróży został wygenerowany!</h3>
                <p className="text-sm text-green-700">
                  Poniżej znajdziesz szczegółowy plan podróży. Możesz go zapisać, aby mieć do niego dostęp później.
                </p>
              </div>
            </div>
          </div>

          {/* Plan content */}
          <div className="space-y-8">
            {plan.content.days.map((day) => (
              <DayCard key={day.day} day={day} />
            ))}

            {/* Disclaimer */}
            {plan.content.disclaimer && <PlanDisclaimer disclaimer={plan.content.disclaimer} />}
          </div>
        </div>

        {/* Fixed save button at bottom */}
        <div className="flex-shrink-0 pt-4 mt-4 border-t border-gray-200 bg-white">
          <Button onClick={onSave} className="w-full" size="lg">
            Zapisz do moich podróży
          </Button>
        </div>
      </div>
    );
  }

  // Saved variant uses simple vertical layout
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Plan podróży</h2>
        {showGeneratedDate && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Wygenerowano: {new Date(plan.created_at).toLocaleDateString("pl-PL")}
          </p>
        )}
      </div>

      {/* Info about read-only and AI generation */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-sm">
            <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">Plan jest tylko do odczytu</p>
            <p className="text-blue-700 dark:text-blue-300">
              Ten plan został wygenerowany przez sztuczną inteligencję i może zawierać nieścisłości. Możesz wygenerować
              nowy plan, jeśli potrzebujesz zmian.
            </p>
          </div>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-8">
        {plan.content.days.map((day) => (
          <DayCard key={day.day} day={day} />
        ))}

        {/* Disclaimer */}
        {plan.content.disclaimer && <PlanDisclaimer disclaimer={plan.content.disclaimer} />}
      </div>
    </div>
  );
}
