import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TRAVEL_PREFERENCES } from "@/types/auth.types";

interface ProfilePreferencesFormProps {
  initialPreferences?: string[];
  onSubmit: (preferences: string[]) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  showCancelButton?: boolean;
  hideActions?: boolean;
  onPreferencesChange?: (preferences: string[]) => void;
}

/**
 * ProfilePreferencesForm - reusable form for selecting travel preferences
 * Used in OnboardingModal and Profile page
 */
export function ProfilePreferencesForm({
  initialPreferences = [],
  onSubmit,
  onCancel,
  submitLabel = "Zapisz preferencje",
  cancelLabel = "Anuluj",
  isSubmitting = false,
  showCancelButton = false,
  hideActions = false,
  onPreferencesChange,
}: ProfilePreferencesFormProps) {
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(initialPreferences);

  const handleCheckboxChange = useCallback(
    (preference: string, checked: boolean) => {
      setSelectedPreferences((prev) => {
        const newPreferences = checked ? [...prev, preference] : prev.filter((p) => p !== preference);
        // Notify parent of preference changes
        onPreferencesChange?.(newPreferences);
        return newPreferences;
      });
    },
    [onPreferencesChange]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await onSubmit(selectedPreferences);
    },
    [onSubmit, selectedPreferences]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Formularz preferencji podróżniczych">
      {/* Categories */}
      {Object.entries(TRAVEL_PREFERENCES).map(([categoryKey, category]) => (
        <div key={categoryKey} className="space-y-3">
          <div>
            <h3 className="text-base font-semibold">{category.label}</h3>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {category.tags.map((preference) => {
              const preferenceId = `preference-${categoryKey}-${preference}`;
              const isChecked = selectedPreferences.includes(preference);

              return (
                <div key={preference} className="flex items-center space-x-2">
                  <Checkbox
                    id={preferenceId}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleCheckboxChange(preference, checked as boolean)}
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor={preferenceId}
                    className="text-sm font-normal cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {preference}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selected count */}
      <div className="pt-2 border-t">
        <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
          Wybrano: <span className="font-medium text-foreground">{selectedPreferences.length}</span>{" "}
          {selectedPreferences.length === 1
            ? "preferencja"
            : selectedPreferences.length > 1 && selectedPreferences.length < 5
              ? "preferencje"
              : "preferencji"}
        </p>
      </div>

      {/* Action buttons - only shown if hideActions is false */}
      {!hideActions && (
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || selectedPreferences.length === 0} className="flex-1">
            {isSubmitting ? "Zapisywanie..." : submitLabel}
          </Button>
          {showCancelButton && onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              {cancelLabel}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
